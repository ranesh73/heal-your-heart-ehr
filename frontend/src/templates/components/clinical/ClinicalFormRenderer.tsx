import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ClinicalTemplate, TemplateComponent } from '../../types';
import { allComponentsOf, computeVisibility } from './conditionalLogic';
import { isNestedTree } from '../viewer/optionTree';
import { NestedOptionField } from '../options/NestedOptionField';

interface ClinicalFormRendererProps {
  template: ClinicalTemplate;
  answers: Record<number, string>;
  onAnswer: (componentId: number, value: string) => void;
  /** Preview and consultation share this renderer; preview just doesn't save. */
  disabled?: boolean;
}

const CHOICE_TYPES = new Set(['Single Choice', 'Yes/No Question', 'Rating Scale', 'Dropdown']);
const MULTI_TYPES = new Set(['Multi Choice', 'Check List', 'Checkbox Group']);

/**
 * Renders a template as the clinical form a doctor fills in.
 *
 * Layout rules, from the clinic's brief:
 *  - answer options sit HORIZONTALLY beside their label, not stacked
 *  - Yes/No renders as two large segmented buttons for fast entry
 *  - conditional follow-ups appear inline, indented, only when their parent
 *    answer requires them - no deep nesting, no separate pages
 */
export const ClinicalFormRenderer: React.FC<ClinicalFormRendererProps> = ({
  template,
  answers,
  onAnswer,
  disabled = false
}) => {
  const components = useMemo(() => allComponentsOf(template), [template]);
  const relationships = template.relationships || [];

  const { visible } = useMemo(
    () => computeVisibility(components, relationships, answers),
    [components, relationships, answers]
  );

  // A question that only appears because of a rule is drawn as a follow-up.
  const conditionalIds = useMemo(
    () => new Set(relationships.map((r) => r.child_component_id)),
    [relationships]
  );

  const sections = template.sections || [];
  const answeredCount = components.filter(
    (c) => typeof c.id === 'number' && visible.has(c.id) && answers[c.id]
  ).length;
  const visibleCount = components.filter((c) => typeof c.id === 'number' && visible.has(c.id)).length;

  const renderControl = (comp: TemplateComponent) => {
    const id = comp.id as number;
    const value = answers[id] ?? '';
    const type = comp.component_type;
    const options = comp.options || [];

    if (type === 'Heading' || type === 'Centered Heading') return null;

    if (options.length > 0 && isNestedTree(options)) {
      return (
        <NestedOptionField
          options={options}
          value={value}
          onChange={(next) => onAnswer(id, next)}
          disabled={disabled}
          idPrefix={`cfr-opt-${id}`}
        />
      );
    }

    const labelLower = comp.label.toLowerCase();

    // Measurement with Unit Selection: Temperature (°C/°F) and Duration (Days/Hours/Weeks/Months)
    const isDuration = labelLower.includes('duration');
    const isTemp = labelLower.includes('temperature');

    if (isDuration || isTemp) {
      const units = isTemp ? ['°C', '°F'] : ['Days', 'Hours', 'Weeks', 'Months'];
      const raw = value || '';
      let numPart = '';
      let unitPart = units[0];

      const match = raw.match(/^([0-9.]+)\s*(.*)$/);
      if (match) {
        numPart = match[1];
        if (match[2] && units.includes(match[2])) {
          unitPart = match[2];
        }
      } else {
        numPart = raw;
      }

      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            step="any"
            className="cfr-input"
            style={{
              width: '140px',
              padding: '7px 10px',
              fontSize: '13.5px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              backgroundColor: disabled ? '#f9fafb' : '#ffffff'
            }}
            placeholder={comp.placeholder || (isTemp ? 'e.g. 38.5' : 'e.g. 4')}
            value={numPart}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value;
              onAnswer(id, val ? `${val} ${unitPart}` : '');
            }}
          />
          <select
            className="cfr-select"
            style={{
              padding: '7px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              backgroundColor: '#f8fafc',
              fontSize: '13.5px',
              fontWeight: 500,
              cursor: disabled ? 'default' : 'pointer'
            }}
            value={unitPart}
            disabled={disabled}
            onChange={(e) => {
              const newUnit = e.target.value;
              if (numPart) {
                onAnswer(id, `${numPart} ${newUnit}`);
              }
            }}
          >
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      );
    }

    // Rating Scale: 1 to 10 clickable interactive number buttons
    if (type === 'Rating Scale') {
      const maxVal = (comp.config as any)?.max || 10;
      const minVal = (comp.config as any)?.min || 1;
      const ratings = Array.from({ length: maxVal - minVal + 1 }, (_, idx) => minVal + idx);

      return (
        <div className="cfr-rating-group" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {ratings.map((score) => {
            const isSelected = value === String(score);
            return (
              <button
                key={score}
                type="button"
                className={`cfr-rating-btn ${isSelected ? 'selected' : ''}`}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: isSelected ? '2px solid #ea580c' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? '#ea580c' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '13.5px',
                  cursor: disabled ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                disabled={disabled}
                onClick={() => onAnswer(id, isSelected ? '' : String(score))}
              >
                {score}
              </button>
            );
          })}
        </div>
      );
    }

    // Multi-select / Checkboxes
    if (MULTI_TYPES.has(type) && options.length > 0) {
      const chosen = value ? value.split(',').map((v) => v.trim()) : [];
      return (
        <div className="cfr-checkbox-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {options.map((opt, i) => {
            const on = chosen.includes(opt.option_label);
            return (
              <label
                key={opt.id ?? i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '5px',
                  border: on ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                  backgroundColor: on ? '#fff7ed' : '#ffffff',
                  color: on ? '#c2410c' : '#334155',
                  fontWeight: on ? 600 : 400,
                  fontSize: '13.5px',
                  cursor: disabled ? 'default' : 'pointer',
                  userSelect: 'none',
                  boxShadow: on ? '0 1px 2px rgba(234, 88, 12, 0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={disabled}
                  onChange={() => {
                    const next = on
                      ? chosen.filter((c) => c !== opt.option_label)
                      : [...chosen, opt.option_label];
                    onAnswer(id, next.join(', '));
                  }}
                  style={{ accentColor: '#ea580c', cursor: disabled ? 'default' : 'pointer', width: '15px', height: '15px' }}
                />
                <span>{opt.option_label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // Dropdown / Select
    if ((type === 'Dropdown' || type === 'Select') && options.length > 0) {
      return (
        <select
          className="cfr-select"
          style={{
            padding: '7px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            fontSize: '13.5px',
            minWidth: '220px',
            cursor: disabled ? 'default' : 'pointer'
          }}
          value={value}
          disabled={disabled}
          onChange={(e) => onAnswer(id, e.target.value)}
        >
          <option value="">-- Select option --</option>
          {options.map((opt, i) => (
            <option key={opt.id ?? i} value={opt.option_label}>
              {opt.option_label}
            </option>
          ))}
        </select>
      );
    }

    // Single Choice / Yes-No
    if (CHOICE_TYPES.has(type) && options.length > 0) {
      const isYesNo = type === 'Yes/No Question' || (options.length === 2 && options.some(o => o.option_label.toLowerCase() === 'yes'));
      if (isYesNo) {
        return (
          <div className="cfr-yesno-group" style={{ display: 'inline-flex', gap: '8px' }}>
            {options.map((opt, i) => {
              const on = value.toLowerCase() === opt.option_label.toLowerCase();
              return (
                <label
                  key={opt.id ?? i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 22px',
                    borderRadius: '5px',
                    border: on ? '2px solid #ea580c' : '1px solid #cbd5e1',
                    backgroundColor: on ? '#fff7ed' : '#ffffff',
                    color: on ? '#c2410c' : '#334155',
                    fontWeight: on ? 700 : 500,
                    fontSize: '14px',
                    cursor: disabled ? 'default' : 'pointer',
                    userSelect: 'none',
                    boxShadow: on ? '0 1px 3px rgba(234, 88, 12, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name={`cfr-yn-${id}`}
                    checked={on}
                    disabled={disabled}
                    onChange={() => onAnswer(id, opt.option_label)}
                    style={{ accentColor: '#ea580c', cursor: disabled ? 'default' : 'pointer', width: '15px', height: '15px' }}
                  />
                  <span>{opt.option_label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      return (
        <div className="cfr-radio-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {options.map((opt, i) => {
            const on = value === opt.option_label;
            return (
              <label
                key={opt.id ?? i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '5px',
                  border: on ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                  backgroundColor: on ? '#fff7ed' : '#ffffff',
                  color: on ? '#c2410c' : '#334155',
                  fontWeight: on ? 600 : 400,
                  fontSize: '13.5px',
                  cursor: disabled ? 'default' : 'pointer',
                  userSelect: 'none',
                  boxShadow: on ? '0 1px 2px rgba(234, 88, 12, 0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name={`cfr-sc-${id}`}
                  checked={on}
                  disabled={disabled}
                  onChange={() => onAnswer(id, opt.option_label)}
                  style={{ accentColor: '#ea580c', cursor: disabled ? 'default' : 'pointer', width: '15px', height: '15px' }}
                />
                <span>{opt.option_label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    const isNotes =
      type === 'Notes' ||
      type === 'Textarea' ||
      Boolean((comp as any).is_multiline) ||
      labelLower.includes('chief concern') ||
      labelLower.includes('clinical note') ||
      labelLower.includes('presentation') ||
      labelLower.includes('comments') ||
      labelLower.includes('history') ||
      labelLower.includes('summary') ||
      labelLower.includes('other symptoms');

    if (isNotes) {
      return (
        <textarea
          className="cfr-input"
          rows={3}
          value={value}
          placeholder={
            comp.placeholder && !comp.placeholder.includes('${patient.')
              ? comp.placeholder
              : 'Describe patient presentation or clinical findings...'
          }
          disabled={disabled}
          onChange={(e) => onAnswer(id, e.target.value)}
          style={{
            width: '100%',
            minHeight: '75px',
            padding: '8px 12px',
            fontSize: '13.5px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            resize: 'vertical',
            lineHeight: 1.45,
            backgroundColor: disabled ? '#f9fafb' : '#ffffff'
          }}
        />
      );
    }

    if (type === 'Table') {
      const configRows = comp.config?.rows;
      if (Array.isArray(configRows) && configRows.length > 0) {
        let cellValues: Record<string, string> = {};
        let extraRows: Array<Array<{ text: string }>> = [];

        try {
          if (value && value.startsWith('{')) {
            const parsed = JSON.parse(value);
            if (parsed.cells || parsed.extraRows) {
              cellValues = parsed.cells || {};
              extraRows = Array.isArray(parsed.extraRows) ? parsed.extraRows : [];
            } else {
              cellValues = parsed;
            }
          }
        } catch {}

        const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
          const nextCells = { ...cellValues, [`${rIdx}_${cIdx}`]: val };
          onAnswer(id, JSON.stringify({ cells: nextCells, extraRows }));
        };

        const handleAddRow = () => {
          const colCount = (configRows[0] || []).length || 3;
          const newRow = Array.from({ length: colCount }, () => ({ text: '' }));
          const nextExtra = [...extraRows, newRow];
          onAnswer(id, JSON.stringify({ cells: cellValues, extraRows: nextExtra }));
        };

        const handleDeleteExtraRow = (extraIdx: number) => {
          const nextExtra = extraRows.filter((_, idx) => idx !== extraIdx);
          onAnswer(id, JSON.stringify({ cells: cellValues, extraRows: nextExtra }));
        };

        const allRenderRows = [
          ...configRows,
          ...extraRows.map((er) => er.map((cell) => ({ text: cell.text, properties: {} })))
        ];

        return (
          <div className="cfr-table-container" style={{ overflowX: 'auto', width: '100%', margin: '6px 0' }}>
            <table
              className="cfr-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #cbd5e1',
                fontSize: '13px'
              }}
            >
              <tbody>
                {allRenderRows.map((row: any[], rIdx: number) => {
                  const isHeaderRow = rIdx === 0;
                  const isExtraRow = rIdx >= configRows.length;
                  const extraIdx = rIdx - configRows.length;

                  return (
                    <tr
                      key={rIdx}
                      style={{
                        backgroundColor: isHeaderRow ? '#f8fafc' : rIdx % 2 === 0 ? '#fcfdfd' : '#ffffff'
                      }}
                    >
                      {row.map((cell: any, cIdx: number) => {
                        const cellProps = cell.properties || {};
                        const cellKey = `${rIdx}_${cIdx}`;
                        const currentCellVal =
                          cellValues[cellKey] ??
                          (!isExtraRow && rIdx > 0 && cIdx > 0 ? (cell.text || '') : '');
                        const isLabelCell = isHeaderRow || (!isExtraRow && cIdx === 0 && Boolean(cell.text));

                        return (
                          <td
                            key={cIdx}
                            style={{
                              borderTop: cellProps.borderTop === false ? 'none' : '1px solid #cbd5e1',
                              borderRight: cellProps.borderRight === false ? 'none' : '1px solid #cbd5e1',
                              borderBottom: cellProps.borderBottom === false ? 'none' : '1px solid #cbd5e1',
                              borderLeft: cellProps.borderLeft === false ? 'none' : '1px solid #cbd5e1',
                              padding: '6px 8px',
                              fontWeight: isHeaderRow || cellProps.bold ? '600' : 'normal',
                              fontStyle: cellProps.italic ? 'italic' : 'normal',
                              textDecoration: cellProps.underline ? 'underline' : 'none',
                              textAlign: cellProps.alignment || 'left',
                              fontSize: cellProps.fontSize ? `${cellProps.fontSize}px` : '13px',
                              backgroundColor: isHeaderRow ? '#f1f5f9' : undefined
                            }}
                          >
                            {isHeaderRow ? (
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                {cell.text || `Column ${cIdx + 1}`}
                              </span>
                            ) : isLabelCell ? (
                              <span style={{ fontWeight: 500, color: '#334155' }}>{cell.text}</span>
                            ) : (
                              <input
                                type="text"
                                className="cfr-input"
                                style={{
                                  width: '100%',
                                  padding: '5px 8px',
                                  fontSize: cellProps.fontSize ? `${cellProps.fontSize}px` : '13px',
                                  textAlign: cellProps.alignment || 'left',
                                  fontWeight: cellProps.bold ? '600' : 'normal',
                                  fontStyle: cellProps.italic ? 'italic' : 'normal',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '3px',
                                  backgroundColor: disabled ? '#f9fafb' : '#ffffff'
                                }}
                                placeholder="Enter answer..."
                                value={currentCellVal}
                                disabled={disabled}
                                onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Action column for extra rows */}
                      {!isHeaderRow && !disabled && (
                        <td
                          style={{
                            width: '40px',
                            textAlign: 'center',
                            border: '1px solid #cbd5e1',
                            padding: '4px'
                          }}
                        >
                          {isExtraRow ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteExtraRow(extraIdx)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="Delete row"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!disabled && (
              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleAddRow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: '#0288d1',
                    border: '1px dashed #0288d1',
                    borderRadius: '4px',
                    backgroundColor: '#f0f9ff',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <Plus size={13} /> Add Row
                </button>
              </div>
            )}
          </div>
        );
      }

      if (options.length > 0) {
        let tableData: Record<string, string> = {};
        try {
          if (value && value.startsWith('{')) {
            tableData = JSON.parse(value);
          }
        } catch {}

        const handleOptionCellChange = (i: number, val: string) => {
          const optLabel = options[i]?.option_label;
          const next = { ...tableData, [String(i)]: val };
          if (optLabel) next[optLabel] = val;
          onAnswer(id, JSON.stringify(next));
        };

        return (
          <div className="cfr-table-container" style={{ overflowX: 'auto', width: '100%', margin: '6px 0' }}>
            <table className="cfr-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #cbd5e1', fontWeight: 600, color: '#1e293b', width: '55%' }}>Parameter</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #cbd5e1', fontWeight: 600, color: '#1e293b', width: '45%' }}>Finding / Value</th>
                </tr>
              </thead>
              <tbody>
                {options.map((row, i) => (
                  <tr key={row.id ?? i}>
                    <th
                      scope="row"
                      style={{
                        padding: '6px 10px',
                        textAlign: 'left',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        fontWeight: 500
                      }}
                    >
                      {row.option_label}
                    </th>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      <input
                        type="text"
                        className="cfr-input"
                        id={`cfr-tbl-${id}-${i}`}
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                        value={tableData[String(i)] ?? tableData[row.option_label] ?? ''}
                        placeholder="Enter answer..."
                        disabled={disabled}
                        onChange={(e) => handleOptionCellChange(i, e.target.value)}
                        aria-label={row.option_label}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    let inputType = 'text';
    if (type === 'Date' || labelLower.includes('date')) inputType = 'date';
    else if (type === 'Time' || labelLower.includes('time')) inputType = 'time';
    else if (type === 'Number Field' || type === 'Number' || labelLower.includes('pulse') || labelLower.includes('saturation') || labelLower.includes('rate') || labelLower.includes('height') || labelLower.includes('weight') || labelLower.includes('bp')) inputType = 'number';
    else if (type === 'Email' || labelLower.includes('email')) inputType = 'email';
    else if (type === 'Phone' || labelLower.includes('phone')) inputType = 'tel';

    return (
      <input
        className="cfr-input"
        type={inputType}
        value={value}
        placeholder={comp.placeholder || 'Enter value...'}
        disabled={disabled}
        onChange={(e) => onAnswer(id, e.target.value)}
        style={{
          width: inputType === 'number' || inputType === 'date' || inputType === 'time' ? '180px' : '100%',
          maxWidth: '450px',
          padding: '7px 10px',
          fontSize: '13.5px',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          backgroundColor: disabled ? '#f9fafb' : '#ffffff'
        }}
      />
    );
  };

  return (
    <div className="cfr-form">
      <div className="cfr-progress" role="status" aria-live="polite">
        {answeredCount} / {visibleCount} answered
      </div>

      {sections.map((section, sIdx) => {
        const shown = (section.components || []).filter(
          (c) => typeof c.id === 'number' && visible.has(c.id)
        );
        if (shown.length === 0) return null;

        return (
          <section className="cfr-section" key={section.id ?? sIdx}>
            <h3 className="cfr-section-title">{section.title}</h3>

            <div className="cfr-rows">
              {shown.map((comp) => {
                const id = comp.id as number;

                if (comp.component_type === 'Heading' || comp.component_type === 'Centered Heading') {
                  const isCentered = comp.component_type === 'Centered Heading';
                  return (
                    <h4
                      className={`cfr-heading ${isCentered ? 'ctv-centered-heading' : ''}`}
                      key={id}
                      style={isCentered ? { textAlign: 'center', margin: '14px 0 10px 0', fontSize: '15.5px', fontWeight: 700 } : undefined}
                    >
                      {comp.label}
                    </h4>
                  );
                }

                const isFollowUp = conditionalIds.has(id);
                const isFullWidth =
                  comp.component_type === 'Table' ||
                  Boolean(comp.options && comp.options.length > 0 && isNestedTree(comp.options));
                const isMandatory = Boolean(comp.is_required || comp.is_mandatory);

                return (
                  <div
                    className={`cfr-row ${isFollowUp ? 'followup' : ''} ${isFullWidth ? 'full-width-control' : ''}`}
                    key={id}
                  >
                    <label className="cfr-label" htmlFor={`cfr-${id}`}>
                      {comp.label}
                      {isMandatory ? <span className="cfr-req"> *</span> : null}
                    </label>
                    <div className="cfr-control" id={`cfr-${id}`}>
                      {renderControl(comp)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {visibleCount === 0 && (
        <p className="cfr-empty">
          This template has no questions yet. Add components in the editor.
        </p>
      )}
    </div>
  );
};
