import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, RotateCcw, X } from 'lucide-react';
import { ClinicalTemplate } from '../../types';
import { ClinicalFormRenderer } from './ClinicalFormRenderer';
import { allComponentsOf, computeVisibility, pruneHiddenAnswers } from './conditionalLogic';

interface TemplatePreviewProps {
  isOpen: boolean;
  template: ClinicalTemplate | null;
  onClose: () => void;
}

/**
 * Preview of a template exactly as a doctor will see it in consultation.
 *
 * Deliberately excludes every authoring affordance - no drag handles, no
 * delete buttons, no properties panel, and no patient selection. Answers are
 * live so conditional branches can be exercised, but nothing is persisted.
 */
export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ isOpen, template, onClose }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const components = useMemo(
    () => (template ? allComponentsOf(template) : []),
    [template]
  );

  // Reset the trial answers each time a preview is opened.
  useEffect(() => {
    if (isOpen) setAnswers({});
  }, [isOpen, template?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [isOpen, onClose]);

  /** Record an answer, then clear anything its branch just closed. */
  const handleAnswer = useCallback(
    (componentId: number, value: string) => {
      setAnswers((prev) => {
        const next = { ...prev };
        if (value === '') delete next[componentId];
        else next[componentId] = value;

        const { hidden } = computeVisibility(components, template?.relationships || [], next);
        return pruneHiddenAnswers(next, hidden);
      });
    },
    [components, template?.relationships]
  );

  if (!isOpen || !template) return null;

  return (
    <div className="tpv-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="tpv-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpv-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tpv-header">
          <div className="tpv-title-wrap">
            <Eye size={17} aria-hidden="true" />
            <div>
              <h3 id="tpv-title">Preview — {template.name}</h3>
              <p className="tpv-sub">
                {template.template_type} · This is how the form appears during a consultation.
                Answers here are not saved.
              </p>
            </div>
          </div>
          <div className="tpv-header-actions">
            <button type="button" className="btn-secondary" onClick={() => setAnswers({})}>
              <RotateCcw size={14} aria-hidden="true" /> Reset answers
            </button>
            <button
              ref={closeRef}
              type="button"
              className="tpv-close-x"
              onClick={onClose}
              aria-label="Close preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="tpv-body">
          <ClinicalFormRenderer template={template} answers={answers} onAnswer={handleAnswer} />
        </div>

        <div className="tpv-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
