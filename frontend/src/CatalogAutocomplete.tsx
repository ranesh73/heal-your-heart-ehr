import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Pill, Syringe, Package, FlaskConical, Film, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { api } from "./api";

export interface CatalogItem {
  id: string;
  catalogue_id: string;
  name: string;
  display_name: string;
  trade_name?: string;
  generic_name?: string;
  kind: "medication" | "injection" | "inventory" | "lab" | "imaging" | "vaccine" | string;
  badge?: string;
  dose_form?: string;
  strength?: string;
  route?: string;
  unit?: string;
  code?: string;
  price_paise?: number;
  details?: Record<string, any>;
}

export interface CatalogAutocompleteProps {
  value: string;
  catalogueId?: string | null;
  type?: "all" | "medicine" | "drug" | "medication" | "injection" | "inventory" | "lab" | "imaging" | "vaccine";
  onSelect: (item: CatalogItem) => void;
  onChangeText?: (text: string) => void;
  onChange?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  inputStyle?: React.CSSProperties;
  showBadge?: boolean;
}

export function CatalogAutocomplete({
  value,
  catalogueId,
  type = "all",
  onSelect,
  onChangeText,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  id = "catalog-autocomplete-input",
  className = "",
  inputStyle = {},
  showBadge = true,
}: CatalogAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<CatalogItem[]>([]);
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

  const defaultPlaceholder =
    type === "injection"
      ? "Search injection catalogue (e.g. Deform 20ml, Lasix, Clexane)..."
      : type === "medicine" || type === "drug" || type === "medication"
      ? "Search master formulary by Product Name, Trade Name or Strength..."
      : type === "inventory"
      ? "Search medical inventory supplies & stock items..."
      : type === "lab"
      ? "Search lab test compendium (e.g. Lipid Profile, HbA1c)..."
      : "Search centralized master catalogue...";

  const activePlaceholder = placeholder || defaultPlaceholder;

  const fetchCatalog = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const trimmed = searchTerm.trim();
        const params = new URLSearchParams();
        if (type && type !== "all") params.append("type", type);
        if (trimmed) params.append("q", trimmed);
        params.append("limit", "40");

        const data = await api<CatalogItem[]>(`/catalogue/search?${params.toString()}`);
        setResults(data || []);
        setHighlightedIndex(-1);
      } catch (err: any) {
        console.error("Failed to query catalogue search:", err);
        setError("Unable to search catalogue");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [type]
  );

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
    }, 150);
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

  const selectItem = (item: CatalogItem) => {
    setQuery(item.name);
    setOpen(false);
    onSelect(item);
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case "injection":
        return <Syringe size={14} style={{ color: "#0284c7", flexShrink: 0 }} />;
      case "inventory":
        return <Package size={14} style={{ color: "#0d9488", flexShrink: 0 }} />;
      case "lab":
        return <FlaskConical size={14} style={{ color: "#7c3aed", flexShrink: 0 }} />;
      case "imaging":
        return <Film size={14} style={{ color: "#ea580c", flexShrink: 0 }} />;
      case "vaccine":
        return <ShieldCheck size={14} style={{ color: "#16a34a", flexShrink: 0 }} />;
      default:
        return <Pill size={14} style={{ color: "#0f766e", flexShrink: 0 }} />;
    }
  };

  const getBadgeStyle = (kind: string) => {
    switch (kind) {
      case "injection":
        return { background: "#e0f2fe", color: "#0369a1" };
      case "inventory":
        return { background: "#ccfbf1", color: "#0f766e" };
      case "lab":
        return { background: "#ede9fe", color: "#6d28d9" };
      case "imaging":
        return { background: "#ffedd5", color: "#c2410c" };
      case "vaccine":
        return { background: "#dcfce7", color: "#15803d" };
      default:
        return { background: "#f0fdfa", color: "#0d9488" };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{ position: "relative", width: "100%" }}
    >
      <div style={{ position: "relative", width: "100%" }}>
        <Search
          size={15}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#94a3b8",
            pointerEvents: "none",
            zIndex: 2,
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
          placeholder={activePlaceholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: "100%",
            height: 36,
            padding: "0 32px 0 32px",
            fontSize: "13px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            outline: "none",
            background: disabled ? "#f8fafc" : "#ffffff",
            color: "#1e293b",
            boxSizing: "border-box",
            ...inputStyle,
          }}
        />
        {loading && (
          <Loader2
            size={14}
            className="animate-spin"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#0d9488",
            }}
          />
        )}
      </div>

      {catalogueId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
            fontSize: 11,
            color: "#0f766e",
            fontWeight: 500,
          }}
        >
          <Check size={12} /> Linked to master catalogue
        </div>
      )}

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#ffffff",
            border: "1px solid #0d9488",
            borderRadius: 6,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)",
            zIndex: 99999,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {error && (
            <div style={{ padding: "10px 12px", color: "#ef4444", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div style={{ padding: "12px", color: "#64748b", fontSize: 13, textAlign: "center" }}>
              {query.trim() ? (
                <>
                  No matching catalogue records found for "<strong>{query}</strong>".
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    Custom name will be saved directly if you proceed.
                  </div>
                </>
              ) : (
                "Type a product, trade name, or generic drug to search..."
              )}
            </div>
          )}

          {results.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const isCurrent = catalogueId && item.id === catalogueId;

            return (
              <div
                key={`${item.kind}-${item.id}-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(item);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  background: isHighlighted ? "#f0fdfa" : isCurrent ? "#f8fafc" : "#ffffff",
                  borderBottom: "1px solid #f1f5f9",
                  transition: "background 0.1s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1 }}>
                  {getKindIcon(item.kind)}
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{item.name}</span>
                    {item.trade_name && item.trade_name.toLowerCase() !== item.name.toLowerCase() && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "#f1f5f9",
                          color: "#475569",
                          fontWeight: 500,
                        }}
                      >
                        Trade: {item.trade_name}
                      </span>
                    )}
                    {item.strength && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b" }}>
                        · {item.strength}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  {showBadge && item.badge && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 4,
                        ...getBadgeStyle(item.kind),
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isCurrent && <Check size={14} style={{ color: "#0d9488" }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

