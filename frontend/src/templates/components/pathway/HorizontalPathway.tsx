import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, ArrowRight, Sparkles, HelpCircle, Layers } from 'lucide-react';
import { ClinicalTemplate, TemplateComponent, TemplateRelationship } from '../../types';
import { isNestedTree } from '../viewer/optionTree';
import { NestedOptionField } from '../options/NestedOptionField';

interface HorizontalPathwayProps {
  template: ClinicalTemplate;
  answers: Record<number, string>;
  onAnswerChange: (componentId: number, value: string) => void;
  activeComponentId: number | null;
  onSelectCard: (componentId: number) => void;
  visibleComponents: TemplateComponent[];
}

export const HorizontalPathway: React.FC<HorizontalPathwayProps> = ({
  template,
  answers,
  onAnswerChange,
  activeComponentId,
  onSelectCard,
  visibleComponents
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest visible card when it appears
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setTimeout(() => {
        container.scrollTo({
          left: container.scrollWidth,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [visibleComponents.length]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current && e.deltaY !== 0) {
      // Allow natural horizontal scroll via mouse wheel
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="horizontal-pathway-container">
      {/* Top pathway bar with navigation controls */}
      <div className="pathway-header-row">
        <div className="pathway-title-wrap">
          <span className="pathway-badge">
            <Sparkles size={12} style={{ marginRight: '4px' }} />
            Horizontal Clinical Pathway
          </span>
          <span style={{ fontSize: '12px', color: '#4b5563' }}>
            Progressive Disclosure: Active chain ({visibleComponents.length} question{visibleComponents.length === 1 ? '' : 's'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="pathway-nav-btn"
            onClick={scrollLeft}
            title="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="pathway-nav-btn"
            onClick={scrollRight}
            title="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* HORIZONTAL SCROLL AREA ONLY */}
      <div
        className="horizontal-scroll-track"
        ref={scrollContainerRef}
        onWheel={handleWheel}
        tabIndex={0}
        aria-label="Clinical question horizontal sequence"
      >
        {visibleComponents.map((component, idx) => {
          const isAnswered = Boolean(answers[component.id!]);
          const currentAnswer = answers[component.id!] || '';
          const isActive = activeComponentId === component.id;
          const isLast = idx === visibleComponents.length - 1;

          return (
            <React.Fragment key={component.id}>
              {/* Question Card */}
              <div
                className={`pathway-card ${isActive ? 'active' : ''} ${isAnswered ? 'completed' : ''}`}
                onClick={() => onSelectCard(component.id!)}
              >
                {/* Card Top Label */}
                <div className="card-header">
                  <div className="card-step-badge">
                    Step {idx + 1}
                  </div>
                  {isAnswered && (
                    <span className="card-status-badge">
                      <CheckCircle2 size={12} style={{ marginRight: '3px' }} /> Answered
                    </span>
                  )}
                </div>

                {/* Card Question */}
                <div className="card-question-title">
                  {component.label}
                  {component.is_required ? <span style={{ color: '#e53935', marginLeft: '3px' }}>*</span> : null}
                </div>

                {/* Question Input Controls based on component type */}
                <div className="card-controls-area">
                  {/* YES / NO */}
                  {component.component_type === 'Yes/No Question' && (
                    <div className="radio-group-vertical">
                      {['Yes', 'No'].map((opt) => (
                        <label
                          key={opt}
                          className={`radio-label-box ${currentAnswer === opt ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`q_${component.id}`}
                            value={opt}
                            checked={currentAnswer === opt}
                            onChange={() => onAnswerChange(component.id!, opt)}
                          />
                          <span className="radio-custom-indicator"></span>
                          <span className="radio-text">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* SINGLE CHOICE or CHECK LIST as single */}
                  {/* A Check List whose options nest is a hierarchy, not a
                      single answer: it gets the horizontal cascade, where a
                      level appears only once the option above it is ticked. */}
                  {component.component_type === 'Check List' &&
                    isNestedTree(component.options) && (
                      <NestedOptionField
                        options={component.options}
                        value={currentAnswer}
                        onChange={(next) => onAnswerChange(component.id!, next)}
                        idPrefix={`hp-opt-${component.id}`}
                      />
                    )}

                  {(component.component_type === 'Single Choice' ||
                    (component.component_type === 'Check List' && !isNestedTree(component.options))) && (
                    <div className="radio-group-vertical">
                      {(component.options || []).map((opt) => (
                        <label
                          key={opt.option_value || opt.option_label}
                          className={`radio-label-box ${currentAnswer === (opt.option_value || opt.option_label) ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`q_${component.id}`}
                            value={opt.option_value || opt.option_label}
                            checked={currentAnswer === (opt.option_value || opt.option_label)}
                            onChange={() => onAnswerChange(component.id!, opt.option_value || opt.option_label)}
                          />
                          <span className="radio-custom-indicator"></span>
                          <span className="radio-text">{opt.option_label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* MULTI CHOICE (stored as comma-separated values) */}
                  {component.component_type === 'Multi Choice' && (
                    <div className="checkbox-group-vertical">
                      {(component.options || []).map((opt) => {
                        const val = opt.option_value || opt.option_label;
                        const currentArr = currentAnswer ? currentAnswer.split(', ') : [];
                        const isChecked = currentArr.includes(val);

                        return (
                          <label
                            key={val}
                            className={`checkbox-label-box ${isChecked ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let newArr = [...currentArr];
                                if (e.target.checked) {
                                  newArr.push(val);
                                } else {
                                  newArr = newArr.filter((item) => item !== val);
                                }
                                onAnswerChange(component.id!, newArr.join(', '));
                              }}
                            />
                            <span className="checkbox-custom-indicator"></span>
                            <span className="radio-text">{opt.option_label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* SIMPLE QUESTION or TEXT FIELD */}
                  {(component.component_type === 'Simple Question' || component.component_type === 'Text Field') && (
                    <div>
                      <input
                        type="text"
                        className="pathway-input-field"
                        placeholder={component.placeholder || 'Enter clinical response...'}
                        value={currentAnswer}
                        onChange={(e) => onAnswerChange(component.id!, e.target.value)}
                      />
                    </div>
                  )}

                  {/* NOTES or HEADING */}
                  {component.component_type === 'Notes' && (
                    <div>
                      <textarea
                        className="pathway-textarea-field"
                        rows={3}
                        placeholder={component.placeholder || 'Enter clinical observations or notes...'}
                        value={currentAnswer}
                        onChange={(e) => onAnswerChange(component.id!, e.target.value)}
                      />
                    </div>
                  )}

                  {/* RATING SCALE */}
                  {component.component_type === 'Rating Scale' && (
                    <div className="rating-scale-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className={`rating-pill ${currentAnswer === num.toString() ? 'selected' : ''}`}
                          onClick={() => onAnswerChange(component.id!, num.toString())}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* TABLE or OTHER */}
                  {component.component_type === 'Table' && (
                    <div style={{ fontSize: '12px', color: '#4b5563' }}>
                      <input
                        type="text"
                        className="pathway-input-field"
                        placeholder="e.g. 120/80 mmHg, HR 72 bpm"
                        value={currentAnswer}
                        onChange={(e) => onAnswerChange(component.id!, e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Card footer info */}
                <div className="card-footer-info">
                  <span>Type: {component.component_type}</span>
                  {component.default_value && (
                    <span style={{ color: '#2e7d32', fontWeight: 600 }}>Default: {component.default_value}</span>
                  )}
                </div>
              </div>

              {/* Horizontal Visual Connector Arrow between cards */}
              {!isLast && (
                <div className="pathway-connector">
                  <div className={`connector-line ${isAnswered ? 'active' : ''}`}></div>
                  <div className={`connector-arrow ${isAnswered ? 'active' : ''}`}>
                    <ArrowRight size={15} />
                  </div>
                  <div className={`connector-line ${isAnswered ? 'active' : ''}`}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Next placeholder hint if more questions exist in tree */}
        <div className="pathway-next-hint-card">
          <HelpCircle size={22} color="#9ca3af" />
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
            Progressive Disclosure
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', lineHeight: '1.4' }}>
            Answer questions sequentially. Subsequent diagnostic branches reveal automatically.
          </div>
        </div>
      </div>
    </div>
  );
};
