import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Printer, StickyNote, Trash2, X } from "lucide-react";
import { api, branch, navigate, Row } from "./api";
import { useApp } from "./context";
import { ClinicLetterhead } from "./DischargeSummaryViewer";

export type StickyColorKey = "yellow" | "mint" | "blue" | "pink";

export interface StickyColorMeta {
  key: StickyColorKey;
  label: string;
  bg: string;
  headerBg: string;
  border: string;
  fold: string;
  accent: string;
  text: string;
}

export const STICKY_COLORS: Record<StickyColorKey, StickyColorMeta> = {
  yellow: {
    key: "yellow",
    label: "Warm Yellow",
    bg: "#FEF9C3",
    headerBg: "#FEF08A",
    border: "#FDE047",
    fold: "#EAB308",
    accent: "#CA8A04",
    text: "#713F12",
  },
  mint: {
    key: "mint",
    label: "Soft Mint",
    bg: "#DCFCE7",
    headerBg: "#BBF7D0",
    border: "#86EFAC",
    fold: "#22C55E",
    accent: "#15803D",
    text: "#14532D",
  },
  blue: {
    key: "blue",
    label: "Sky Blue",
    bg: "#E0F2FE",
    headerBg: "#BAE6FD",
    border: "#7DD3FC",
    fold: "#0EA5E9",
    accent: "#0369A1",
    text: "#0C4A6E",
  },
  pink: {
    key: "pink",
    label: "Rose Pink",
    bg: "#FCE7F3",
    headerBg: "#FBCFE8",
    border: "#F9A8D4",
    fold: "#EC4899",
    accent: "#BE185D",
    text: "#831843",
  },
};

export const STICKY_COLOR_LIST: StickyColorMeta[] = [
  STICKY_COLORS.yellow,
  STICKY_COLORS.mint,
  STICKY_COLORS.blue,
  STICKY_COLORS.pink,
];

export function getStickyMeta(color?: string): StickyColorMeta {
  if (color && color in STICKY_COLORS) {
    return STICKY_COLORS[color as StickyColorKey];
  }
  return STICKY_COLORS.yellow;
}

function formatNoteDateTime(value?: string | null): { date: string; time: string } {
  if (!value) return { date: "—", time: "" };
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { date: value, time: "" };
    const date = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(d);
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    return { date, time };
  } catch {
    return { date: value, time: "" };
  }
}

/* ============================================================================
   1. ADD / EDIT NOTE MODAL (Matches exact ChARM Add Note modal)
   ============================================================================ */
export function QuickNoteFormModal({
  patientId,
  existing,
  onClose,
  onSaved,
}: {
  patientId: string;
  existing?: Row | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [content, setContent] = useState<string>(existing?.content || "");
  const [color, setColor] = useState<StickyColorKey>(
    (existing?.color as StickyColorKey) || "yellow",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const syncAll = () => {
    void qc.invalidateQueries({ queryKey: ["patient-quick-notes"] });
    void qc.invalidateQueries({ queryKey: ["chart"] });
    void qc.invalidateQueries({ queryKey: ["patients"] });
    void qc.invalidateQueries({ queryKey: ["appointments"] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please enter a note.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (existing?.id) {
        await api(`/quick-notes/${existing.id}`, "PUT", {
          content: content.trim(),
          color,
        });
        notify("Quick note updated.");
      } else {
        await api(`/patients/${patientId}/quick-notes`, "POST", {
          content: content.trim(),
          color,
        });
        notify("Quick note added.");
      }
      syncAll();
      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-modal-backdrop" onClick={onClose}>
      <div
        className="ct-modal-dialog qn-add-modal"
        role="dialog"
        aria-modal="true"
        aria-label={existing ? "Edit Note" : "Add Note"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ct-modal-header">
          <h3>{existing ? "Edit Note" : "Add Note"}</h3>
          <button
            type="button"
            className="ct-icon-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="qn-modal-form">
          {error && <div className="ct-error-box">{error}</div>}

          <textarea
            ref={textareaRef}
            className="qn-textarea"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a quick note or front-desk sticky note for this patient..."
            required
          />

          {/* Optional Sticky Note Color Tag Selector */}
          <div className="qn-color-bar">
            <span className="qn-color-label">Sticky Color:</span>
            <div className="qn-color-options">
              {STICKY_COLOR_LIST.map((c) => {
                const active = color === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    className={`qn-color-pill ${active ? "active" : ""}`}
                    style={{
                      background: c.bg,
                      borderColor: active ? c.accent : c.border,
                      color: c.text,
                    }}
                    onClick={() => setColor(c.key)}
                  >
                    <span
                      className="qn-color-dot"
                      style={{ background: c.fold }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="qn-modal-footer">
            <button type="submit" className="ct-btn-orange" disabled={saving}>
              {saving ? "Saving..." : existing ? "Save" : "Add"}
            </button>
            <button type="button" className="ct-btn-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   2. PRINTABLE QUICK NOTES MODAL (With Official Heal Your Heart Letterhead)
   ============================================================================ */
function PrintQuickNotesModal({
  notes,
  patient,
  facility,
  onClose,
}: {
  notes: Row[];
  patient?: Row;
  facility?: Row;
  onClose: () => void;
}) {
  return (
    <div className="discharge-viewer-backdrop">
      <section
        className="discharge-summary-print-root"
        role="dialog"
        aria-modal="true"
        aria-label="Print Quick Notes"
      >
        <div className="discharge-summary-toolbar">
          <div className="discharge-summary-toolbar-title">
            <button
              type="button"
              className="discharge-icon-button"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Quick Notes Report</span>
          </div>
          <div className="discharge-summary-toolbar-actions">
            <button
              type="button"
              className="discharge-action-button primary"
              onClick={() => window.print()}
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        <div className="discharge-viewer-scroll">
          <article className="discharge-document">
            <ClinicLetterhead facility={facility} phonePrefix="Phone: " />
            <div className="discharge-divider-line" />
            <h1
              className="discharge-document-title"
              style={{ textDecoration: "none", marginBottom: 8 }}
            >
              Patient Quick Notes
            </h1>
            {patient && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12.5,
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: "1px solid #cbd5e1",
                }}
              >
                <span>
                  <strong>Patient:</strong> {patient.name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim()}
                </span>
                <span>
                  <strong>Record ID:</strong> {patient.mrn || "—"}
                </span>
              </div>
            )}
            <table className="clinical-summary-table">
              <thead>
                <tr>
                  <th style={{ width: "60%" }}>Notes</th>
                  <th style={{ width: "20%" }}>Added By</th>
                  <th style={{ width: "20%" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No data available</td>
                  </tr>
                ) : (
                  notes.map((n) => {
                    const dt = formatNoteDateTime(n.created_at);
                    return (
                      <tr key={n.id}>
                        <td style={{ whiteSpace: "pre-wrap" }}>{n.content}</td>
                        <td>{n.created_by_name || "Staff"}</td>
                        <td>
                          {dt.date} {dt.time}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </article>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   3. PATIENT QUICK NOTES TAB (Patient Chart -> Quick Notes)
   ============================================================================ */
export function PatientQuickNotesTab({
  patientId,
  patient,
  onNotesChanged,
}: {
  patientId: string;
  patient?: Row;
  onNotesChanged?: () => void;
}) {
  const { facilities, notify } = useApp();
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const notesQuery = useQuery({
    queryKey: ["patient-quick-notes", branch, patientId],
    queryFn: () => api<Row[]>(`/patients/${patientId}/quick-notes`),
    enabled: Boolean(patientId),
  });

  const notes = notesQuery.data || [];
  const currentFacility = facilities.find((f) => f.id === branch) || facilities[0];

  const syncAll = () => {
    void qc.invalidateQueries({ queryKey: ["patient-quick-notes"] });
    void qc.invalidateQueries({ queryKey: ["chart"] });
    void qc.invalidateQueries({ queryKey: ["patients"] });
    void qc.invalidateQueries({ queryKey: ["appointments"] });
    onNotesChanged?.();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const allSelected =
    notes.length > 0 && notes.every((n) => selectedIds.includes(n.id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : notes.map((n) => n.id));
  };

  const handleDeleteOne = async (note: Row) => {
    setDeletingId(note.id);
    try {
      await api(`/quick-notes/${note.id}`, "DELETE");
      setSelectedIds((prev) => prev.filter((x) => x !== note.id));
      notify("Quick note deleted.");
      syncAll();
    } catch (err: any) {
      notify(err?.message || "Unable to delete quick note");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      notify("Select at least one note to delete.");
      return;
    }
    try {
      await api("/quick-notes/bulk-delete", "POST", { note_ids: selectedIds });
      setSelectedIds([]);
      notify("Selected quick notes deleted.");
      syncAll();
    } catch (err: any) {
      notify(err?.message || "Unable to delete selected notes");
    }
  };

  const printableNotes =
    selectedIds.length > 0
      ? notes.filter((n) => selectedIds.includes(n.id))
      : notes;

  return (
    <div className="qn-tab-shell">
      {/* Header Bar */}
      <div className="qn-tab-header">
        <h2 className="qn-tab-title">Quick Notes</h2>
        <button
          type="button"
          className="ct-btn-orange"
          onClick={() => {
            setEditing(null);
            setShowAdd(true);
          }}
        >
          <Plus size={15} /> Note
        </button>
      </div>

      {/* Bulk Action Bar: Delete & Print */}
      <div className="ct-bulk-bar">
        <button
          type="button"
          className="ct-bulk-btn"
          disabled={selectedIds.length === 0}
          onClick={() => void handleBulkDelete()}
        >
          Delete{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
        </button>
        <button
          type="button"
          className="ct-bulk-btn"
          onClick={() => setShowPrint(true)}
        >
          Print
        </button>
      </div>

      {/* Data Table */}
      <div className="qn-table-wrap">
        <table className="qn-table">
          <thead>
            <tr>
              <th style={{ width: 38, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all quick notes"
                />
              </th>
              <th style={{ width: "54%" }}>Notes</th>
              <th style={{ width: "18%" }}>Added By</th>
              <th style={{ width: "18%" }}>Date</th>
              <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notesQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="pa-empty-row">
                  Loading quick notes...
                </td>
              </tr>
            ) : notes.length === 0 ? (
              <tr>
                <td colSpan={5} className="pa-empty-row">
                  No data available
                </td>
              </tr>
            ) : (
              notes.map((n) => {
                const meta = getStickyMeta(n.color);
                const dt = formatNoteDateTime(n.created_at);
                return (
                  <tr key={n.id}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(n.id)}
                        onChange={() => toggleSelect(n.id)}
                        aria-label="Select quick note"
                      />
                    </td>
                    <td>
                      <div className="qn-note-cell">
                        <span
                          className="qn-note-color-swatch"
                          style={{
                            background: meta.bg,
                            borderColor: meta.fold,
                          }}
                          title={meta.label}
                        />
                        <div className="qn-note-text">{n.content}</div>
                      </div>
                    </td>
                    <td>{n.created_by_name || "Staff"}</td>
                    <td>
                      <div>{dt.date}</div>
                      {dt.time && (
                        <small style={{ color: "#64748b", fontSize: 11 }}>
                          {dt.time}
                        </small>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="pa-row-actions">
                        <button
                          type="button"
                          className="pa-action-icon-btn"
                          title="Edit Note"
                          aria-label="Edit Note"
                          onClick={() => {
                            setEditing(n);
                            setShowAdd(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="pa-action-icon-btn danger"
                          title="Delete Note"
                          aria-label="Delete Note"
                          disabled={deletingId === n.id}
                          onClick={() => void handleDeleteOne(n)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <QuickNoteFormModal
          patientId={patientId}
          existing={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={() => onNotesChanged?.()}
        />
      )}

      {showPrint && (
        <PrintQuickNotesModal
          notes={printableNotes}
          patient={patient}
          facility={currentFacility}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

/* ============================================================================
   4. ANIMATED STICKY NOTE BADGE & POPOVER (Calendar Cards & Patient Header)
   ============================================================================ */
export function CalendarStickyNotePopover({
  notes,
  patientId,
  patientName,
  compact = false,
  align = "left",
}: {
  notes?: Row[];
  patientId: string;
  patientName?: string;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [addingInline, setAddingInline] = useState(false);
  const [inlineContent, setInlineContent] = useState("");
  const [inlineColor, setInlineColor] = useState<StickyColorKey>("yellow");
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
        setAddingInline(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  if (!notes || notes.length === 0) return null;

  const primaryMeta = getStickyMeta(notes[0]?.color);

  const syncAll = () => {
    void qc.invalidateQueries({ queryKey: ["appointments"] });
    void qc.invalidateQueries({ queryKey: ["patients"] });
    void qc.invalidateQueries({ queryKey: ["chart"] });
    void qc.invalidateQueries({ queryKey: ["patient-quick-notes"] });
  };

  const handleInlineAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineContent.trim()) return;
    setSaving(true);
    try {
      await api(`/patients/${patientId}/quick-notes`, "POST", {
        content: inlineContent.trim(),
        color: inlineColor,
      });
      setInlineContent("");
      setAddingInline(false);
      notify("Quick note added.");
      syncAll();
    } catch (err: any) {
      notify(err?.message || "Unable to add quick note");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api(`/quick-notes/${noteId}`, "DELETE");
      notify("Quick note deleted.");
      syncAll();
    } catch (err: any) {
      notify(err?.message || "Unable to delete quick note");
    }
  };

  return (
    <div
      ref={wrapRef}
      className="qn-sticky-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned && !addingInline) setOpen(false);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Folded-Corner Sticky Note Badge with Peel/Wiggle Hover Animation */}
      <button
        type="button"
        className={`qn-sticky-badge ${compact ? "compact" : ""}`}
        style={{
          background: primaryMeta.headerBg,
          borderColor: primaryMeta.fold,
          color: primaryMeta.text,
        }}
        title={`${notes.length} Quick Note${notes.length === 1 ? "" : "s"} — Click or hover to view`}
        aria-label={`Quick Notes (${notes.length})`}
        onClick={(e) => {
          e.stopPropagation();
          const next = !pinned;
          setPinned(next);
          setOpen(next);
        }}
      >
        <span className="qn-badge-dogear" style={{ borderTopColor: primaryMeta.fold }} />
        <StickyNote size={compact ? 11 : 13} strokeWidth={2.2} />
        <span className="qn-sticky-badge-count">{notes.length}</span>
      </button>

      {/* Paper-Unfold Animated Sticky Note Popover */}
      {open && (
        <div
          className={`qn-sticky-popover ${align === "right" ? "align-right" : ""}`}
          style={{
            background: primaryMeta.bg,
            borderColor: primaryMeta.border,
          }}
          role="dialog"
          aria-label="Patient Sticky Notes"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className="qn-popover-dogear"
            style={{
              background: `linear-gradient(225deg, #fff 48%, ${primaryMeta.fold} 50%, ${primaryMeta.headerBg} 100%)`,
            }}
          />

          <div
            className="qn-sticky-popover-head"
            style={{ borderBottomColor: primaryMeta.border, color: primaryMeta.text }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StickyNote size={14} />
              <strong>Quick Notes ({notes.length})</strong>
              {patientName && <span className="qn-sticky-pat-sub">· {patientName}</span>}
            </div>
            <button
              type="button"
              className="qn-sticky-close"
              aria-label="Close sticky notes"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setPinned(false);
                setAddingInline(false);
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div className="qn-sticky-list">
            {notes.map((n) => {
              const meta = getStickyMeta(n.color);
              const dt = formatNoteDateTime(n.created_at);
              return (
                <div
                  key={n.id}
                  className="qn-sticky-slip"
                  style={{
                    background: meta.bg,
                    borderLeftColor: meta.fold,
                    color: meta.text,
                  }}
                >
                  <div className="qn-sticky-slip-top">
                    <div className="qn-sticky-slip-content">{n.content}</div>
                    <button
                      type="button"
                      className="qn-sticky-slip-del"
                      title="Delete note"
                      aria-label="Delete note"
                      onClick={() => void handleDeleteNote(n.id)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="qn-sticky-slip-meta">
                    <span>{n.created_by_name || "Staff"}</span>
                    <span>
                      {dt.date}
                      {dt.time ? ` · ${dt.time}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Quick-Add from Calendar */}
          {addingInline ? (
            <form onSubmit={(e) => void handleInlineAdd(e)} className="qn-inline-form">
              <textarea
                rows={3}
                autoFocus
                value={inlineContent}
                onChange={(e) => setInlineContent(e.target.value)}
                placeholder="Jot down a quick note..."
                required
              />
              <div className="qn-inline-form-row">
                <div className="qn-inline-dots">
                  {STICKY_COLOR_LIST.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={`qn-dot-btn ${inlineColor === c.key ? "active" : ""}`}
                      style={{ background: c.headerBg, borderColor: c.fold }}
                      title={c.label}
                      onClick={() => setInlineColor(c.key)}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="qn-inline-cancel"
                    onClick={() => {
                      setAddingInline(false);
                      setInlineContent("");
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="qn-inline-save" disabled={saving}>
                    {saving ? "..." : "Save"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="qn-sticky-popover-foot" style={{ borderTopColor: primaryMeta.border }}>
              <button
                type="button"
                className="qn-sticky-add-btn"
                onClick={() => {
                  setPinned(true);
                  setAddingInline(true);
                }}
              >
                <Plus size={12} /> Quick Note
              </button>
              <button
                type="button"
                className="pa-manage-link"
                onClick={() => {
                  setOpen(false);
                  setPinned(false);
                  navigate(`/patients/${patientId}?section=Quick%20Notes`);
                }}
              >
                View All →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
