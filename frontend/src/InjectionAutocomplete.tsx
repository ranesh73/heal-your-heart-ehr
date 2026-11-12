import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Syringe, Check, AlertCircle } from "lucide-react";
import { api, Row } from "./api";

export interface InjectionCatalogItem {
  id: string;
  name: string;
  normalized_name?: string;
  original_source_name?: string;
  verification_status?: string;
  is_active?: boolean;
}

export interface InjectionAutocompleteProps {
  value: string;
  catalogueId?: string | null;
  onSelect: (item: { id: string; name: string }) => void;
  onChangeText?: (text: string) => void;
  onChange?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function InjectionAutocomplete({
  value,
  catalogueId,
  onSelect,
  onChangeText,
  onChange,
  placeholder = "Search or select injection from master catalogue...",
  required = false,
  disabled = false,
  id = "injection-autocomplete-input",
  className = "",
}: InjectionAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<InjectionCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Sync internal query when value prop changes externally
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const fetchCatalog = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const trimmed = searchTerm.trim();
      const endpoint = trimmed
        ? `/injections/catalog?q=${encodeURIComponent(trimmed)}`
        : `/injections/catalog`;
      const data = await api<InjectionCatalogItem[]>(endpoint);
      setResults(data || []);
      setHighlightedIndex(-1);
    } catch (err: any) {
      console.error("Failed to search injection catalogue:", err);
      setError("Unable to search catalogue");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on query change when open
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    if (onChangeText) onChangeText(text);
    if (onChange) onChange(text);
    setOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchCatalog(text);
    }, 200);
  };

  const handleFocus = () => {
    setOpen(true);
    fetchCatalog(query);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        fetchCatalog(query);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        selectItem(results[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const selectItem = (item: InjectionCatalogItem) => {
    setQuery(item.name);
    setOpen(false);
    onSelect({ id: item.id, name: item.name });
  };

  return (
    <div
      ref={containerRef}
      className={`charm-autocomplete-wrap ${className}`}
      style={{ position: "relative", width: "100%" }}
    >
      <div className="charm-input-search-box" style={{ position: "relative", width: "100%" }}>
        <Search
          size={15}
          className="charm-search-icon"
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#94a3b8",
            pointerEvents: "none",
          }}
        />
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className="charm-input"
          style={{
            width: "100%",
            height: 36,
            paddingLeft: 34,
            paddingRight: loading ? 34 : 10,
            fontSize: 13,
            borderRadius: 4,
            border: "1px solid #cbd5e1",
            boxSizing: "border-box",
          }}
        />
        {loading && (
          <Loader2
            size={14}
            className="charm-spin"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#00838f",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>

      {catalogueId && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, color: "#00838f", fontWeight: 500 }}>
          <Check size={12} /> Linked to master catalogue
        </div>
      )}

      {open && (
        <div
          className="charm-autocomplete-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
            zIndex: 9999,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {error && (
            <div
              style={{
                padding: "8px 12px",
                fontSize: 12,
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div
              style={{
                padding: "12px",
                textAlign: "center",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              No injections found
              {query.trim() && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  Add "{query.trim()}" in Settings → Manage Injections
                </div>
              )}
            </div>
          )}

          {results.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const isSelected = item.id === catalogueId;

            return (
              <div
                key={item.id}
                className="charm-autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents input blur
                  selectItem(item);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isHighlighted ? "#f0fdfa" : isSelected ? "#e6fffa" : "#ffffff",
                  borderBottom: "1px solid #f1f5f9",
                  transition: "background 0.1s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Syringe size={14} style={{ color: "#00838f", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                      {item.name}
                    </div>
                    {item.original_source_name && item.original_source_name !== item.name && (
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        Source: {item.original_source_name}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#e0f2fe",
                      color: "#0369a1",
                    }}
                  >
                    Hospital Formulary
                  </span>
                  {isSelected && <Check size={14} style={{ color: "#00838f" }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

