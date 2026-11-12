import React, { useEffect, useRef } from 'react';
import { ClinicalTemplate, TemplateSection } from '../../types';
import { FieldRenderer } from './FieldRenderer';
import { txt } from './decodeEntities';

interface TemplateViewModalProps {
  isOpen: boolean;
  template: ClinicalTemplate | null;
  onClose: () => void;
}

/**
 * One clinical section: an orange heading followed by its fields.
 * The section title comes straight from the stored template, so different
 * templates produce different sections — nothing here is hard-coded.
 */
const SectionRenderer: React.FC<{ section: TemplateSection; index: number }> = ({
  section,
  index
}) => (
  <section className="ctv-section">
    <h4 className="ctv-section-title">{txt(section.title)}</h4>
    <div className="ctv-section-body">
      {section.components.length === 0 ? (
        <p className="ctv-empty">No fields configured in this section.</p>
      ) : (
        section.components.map((component, cIdx) => (
          <FieldRenderer
            key={component.id ?? `${index}-${cIdx}`}
            component={component}
            groupKey={`s${section.id ?? index}`}
          />
        ))
      )}
    </div>
  </section>
);

/**
 * CharmHealth-style read-only clinical template viewer.
 *
 * Layout is a fixed header + metadata row, an independently scrolling
 * content area, and a fixed footer — so a long SOAP template scrolls inside
 * the modal while the page behind it stays put.
 */
export const TemplateViewModal: React.FC<TemplateViewModalProps> = ({
  isOpen,
  template,
  onClose
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeXRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Every clinical field is removed from the tab order, so the trap
      // keeps focus cycling between the close controls and the scroll well.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Stop the page behind the modal from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => closeXRef.current?.focus(), 30);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !template) return null;

  const sections = template.sections || [];

  return (
    <div
      className="ctv-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="ctv-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ctv-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ctv-header">
          <h3 id="ctv-title">View Template</h3>
          <button
            ref={closeXRef}
            type="button"
            className="ctv-close-x"
            onClick={onClose}
            aria-label="Close template viewer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 5 L19 19 M19 5 L5 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Metadata row - read-only, driven by the template record */}
        <div className="ctv-meta-row">
          <div className="ctv-meta-field ctv-meta-name">
            <label htmlFor="ctv-template-name">Template Name</label>
            <input
              id="ctv-template-name"
              type="text"
              value={txt(template.name)}
              title={txt(template.name)}
              readOnly
              tabIndex={-1}
            />
          </div>
          <div className="ctv-meta-field ctv-meta-type">
            <label htmlFor="ctv-template-type">Template Type</label>
            <input
              id="ctv-template-type"
              type="text"
              value={txt(template.template_type)}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Independently scrollable clinical content */}
        <div className="ctv-scroll" tabIndex={0} aria-label="Template content">
          {sections.length === 0 ? (
            <div className="ctv-no-structure">
              {template.content && template.content.trim() ? (
                <>
                  <h4 className="ctv-section-title">Template Content</h4>
                  <pre className="ctv-content-text">{txt(template.content)}</pre>
                </>
              ) : (
                <p className="ctv-empty">
                  This template has no structured sections yet. Use Edit to add content.
                </p>
              )}
            </div>
          ) : (
            sections.map((section, idx) => (
              <SectionRenderer key={section.id ?? idx} section={section} index={idx} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="ctv-footer">
          <button type="button" className="ctv-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
