import React, { useMemo, useState } from 'react';
import { TemplateComponent, TemplateOption } from '../../types';
import { txt } from './decodeEntities';
import { isNestedTree } from './optionTree';
import { HorizontalOptionTree } from '../options/HorizontalOptionTree';
import { buildOptionTreeModel, seedSelection, toggleSelection } from '../options/optionSelection';

/**
 * Read-only clinical field renderer.
 *
 * Every control is inert: text fields are `readOnly`, and radios/checkboxes
 * use `ReadOnlyChoice` below. The viewer must never mutate a template, so a
 * click or keypress cannot change state. Editing happens in the separate
 * template editor.
 *
 * Dispatch is by `component_type`. An unrecognised type falls back to a
 * single-line read-only field, which keeps the viewer forward-compatible
 * with component types added later.
 */

interface FieldProps {
  component: TemplateComponent;
  /** Stable prefix for radio `name` grouping across the whole template. */
  groupKey: string;
}

const RADIO_TYPES = new Set(['Single Choice', 'Dropdown', 'Rating Scale', 'Yes/No Question']);
const CHECKBOX_TYPES = new Set(['Multi Choice', 'Check List', 'Checkbox Group']);
const LONG_TEXT_TYPES = new Set(['Notes', 'Textarea']);
const PLAIN_TEXT_TYPES = new Set(['Text Field', 'Simple Question', 'Number Field', 'Date', 'Time']);

/** Is this option the stored selection for its component? */
function isChecked(option: TemplateOption, component: TemplateComponent): boolean {
  if (option.is_selected) return true;
  const stored = component.default_value;
  if (!stored) return false;
  // A multi-select default is stored comma-separated.
  return stored
    .split(',')
    .map((v) => v.trim())
    .some((v) => v && (v === option.option_value || v === option.option_label));
}

const columnStyle = (count?: number): React.CSSProperties => ({
  gridTemplateColumns: `repeat(${Math.max(1, Math.min(count || 3, 4))}, minmax(0, 1fr))`
});

/**
 * An inert radio/checkbox that keeps its NATIVE appearance.
 *
 * `disabled` would gray out the tick, but the reference shows checked boxes
 * in the normal blue state. So the control stays enabled and is made
 * unmodifiable three ways instead: `pointer-events: none` in CSS, removal
 * from the tab order, and a preventDefault guard as a backstop.
 */
const ReadOnlyChoice: React.FC<{
  type: 'radio' | 'checkbox';
  name?: string;
  checked: boolean;
}> = ({ type, name, checked }) => (
  <input
    type={type}
    name={name}
    checked={checked}
    readOnly
    tabIndex={-1}
    aria-readonly="true"
    onClick={(e) => e.preventDefault()}
    onKeyDown={(e) => e.preventDefault()}
  />
);

/* ------------------------------------------------------------------ labels */

const FieldLabel: React.FC<{ component: TemplateComponent }> = ({ component }) => (
  <div className="ctv-label">
    {txt(component.label)}
    {component.help_text && <span className="ctv-help"> {txt(component.help_text)}</span>}
  </div>
);

/* ------------------------------------------------------- choice grid (flat) */

const ChoiceGrid: React.FC<FieldProps & { kind: 'radio' | 'checkbox' }> = ({
  component,
  groupKey,
  kind
}) => {
  const options = component.options || [];
  const columns = component.column_count || 3;

  // One option per full-width row, as the reference shows for
  // "Physical Activity >=150 min/wk".
  if (columns === 1) {
    return (
      <div className="ctv-stacked-rows">
        {options.map((opt, i) => (
          <div className="ctv-option-panel ctv-stacked-row" key={opt.id ?? i}>
            <label className="ctv-option">
              <ReadOnlyChoice
                type={kind}
                name={`${groupKey}-${component.id}`}
                checked={isChecked(opt, component)}
              />
              <span>{txt(opt.option_label)}</span>
            </label>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="ctv-option-panel">
      <div className="ctv-option-grid" style={columnStyle(columns)}>
        {options.map((opt, i) => (
          <label className="ctv-option" key={opt.id ?? i}>
            <ReadOnlyChoice
              type={kind}
              name={`${groupKey}-${component.id}`}
              checked={isChecked(opt, component)}
            />
            <span>{txt(opt.option_label)}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------ nested options, sideways */

/**
 * A hierarchical option group, laid out left to right.
 *
 * The checkbox is the disclosure: a level appears only once the option above
 * it is ticked, and un-ticking an option takes its whole subtree - and those
 * descendants' selections - with it. That is real state, not a mock: the
 * viewer owns it locally so a clinician can walk a branch while reading the
 * template. It is deliberately NOT written back - the viewer has never
 * mutated the stored template, and the editor remains the place to do that.
 */
const NestedCheckboxGroup: React.FC<FieldProps> = ({ component }) => {
  const model = useMemo(() => buildOptionTreeModel(component.options), [component.options]);

  const [selected, setSelected] = useState<ReadonlySet<number>>(() =>
    seedSelection(model.tree, (opt) => isChecked(opt, component))
  );

  const handleToggle = (optionId: number) =>
    setSelected((prev) =>
      toggleSelection(
        prev,
        optionId,
        model.descendants,
        model.ancestors,
        model.siblings,
        true,
        model.labels
      )
    );

  return (
    <div className="ctv-option-panel">
      <HorizontalOptionTree
        nodes={model.tree}
        selected={selected}
        onToggle={handleToggle}
        idPrefix={`ctv-opt-${component.id}`}
      />
    </div>
  );
};

/* ----------------------------------------------------------------- tables */

const ClinicalTable: React.FC<FieldProps> = ({ component }) => {
  const configRows = component.config?.rows;
  if (Array.isArray(configRows) && configRows.length > 0) {
    return (
      <div className="ctv-table-wrap" style={{ overflowX: 'auto', margin: '8px 0' }}>
        <table className="ctv-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {configRows.map((row: any[], rIdx: number) => (
              <tr key={rIdx} style={{ backgroundColor: rIdx === 0 ? '#f8fafc' : '#ffffff' }}>
                {row.map((cell: any, cIdx: number) => {
                  const p = cell.properties || {};
                  return (
                    <td
                      key={cIdx}
                      style={{
                        borderTop: p.borderTop === false ? 'none' : '1px solid #d1d5db',
                        borderRight: p.borderRight === false ? 'none' : '1px solid #d1d5db',
                        borderBottom: p.borderBottom === false ? 'none' : '1px solid #d1d5db',
                        borderLeft: p.borderLeft === false ? 'none' : '1px solid #d1d5db',
                        padding: '6px 12px',
                        textAlign: p.alignment || 'left',
                        fontWeight: rIdx === 0 || p.bold ? 'bold' : 'normal',
                        fontStyle: p.italic ? 'italic' : 'normal',
                        textDecoration: p.underline ? 'underline' : 'none',
                        fontSize: p.fontSize ? `${p.fontSize}px` : '13px',
                        color: '#1f2937'
                      }}
                    >
                      {txt(cell.text || '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const rows = component.options || [];
  return (
    <div className="ctv-table-wrap" style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table className="ctv-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <th style={{ width: '55%', textAlign: 'left', padding: '6px 12px', border: '1px solid #d1d5db', fontWeight: 'bold', fontSize: '13px' }}>Parameter</th>
            <th style={{ width: '45%', textAlign: 'left', padding: '6px 12px', border: '1px solid #d1d5db', fontWeight: 'bold', fontSize: '13px' }}>Finding / Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              <th scope="row" style={{ padding: '6px 12px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: 'normal' }}>{txt(row.option_label)}</th>
              <td style={{ padding: '6px 12px', border: '1px solid #d1d5db' }} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* --------------------------------------------------------- interpretation */

const InterpretationBlock: React.FC<FieldProps> = ({ component }) => {
  const options = component.options || [];
  return (
    <div className="ctv-option-panel">
      <div className="ctv-interpretation-grid" style={columnStyle(component.column_count || 3)}>
        {options.map((opt, i) => (
          <label className="ctv-option ctv-interpretation-item" key={opt.id ?? i}>
            <ReadOnlyChoice type="checkbox" checked={isChecked(opt, component)} />
            <span>{txt(opt.option_label)}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ text fields */

const TextField: React.FC<FieldProps & { long?: boolean; large?: boolean }> = ({
  component,
  long,
  large
}) => (
  <div className="ctv-option-panel">
    {long ? (
      <textarea
        className="ctv-input"
        rows={3}
        value={txt(component.default_value || '')}
        placeholder={txt(component.placeholder || '')}
        readOnly
        tabIndex={-1}
      />
    ) : (
      <input
        className={`ctv-input ${large ? 'ctv-input-large' : ''}`}
        type="text"
        value={txt(component.default_value || '')}
        placeholder={txt(component.placeholder || '')}
        readOnly
        tabIndex={-1}
      />
    )}
  </div>
);

/* ---------------------------------------------------------------- headings */

const SubHeading: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const cfg = component.config || {};
  return (
    <h5
      className="ctv-subheading"
      style={{
        fontSize: cfg.fontSize ? `${cfg.fontSize}px` : undefined,
        textAlign: cfg.alignment || 'left',
        fontWeight: cfg.bold !== false ? 'bold' : 'normal',
        fontStyle: cfg.italic ? 'italic' : 'normal',
        textDecoration: cfg.underline ? 'underline' : 'none'
      }}
    >
      {txt(component.label)}
    </h5>
  );
};

const CenteredHeading: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const cfg = component.config || {};
  return (
    <h5
      className="ctv-centered-heading"
      style={{
        fontSize: cfg.fontSize ? `${cfg.fontSize}px` : undefined,
        textAlign: 'center',
        fontWeight: cfg.bold !== false ? 'bold' : 'normal',
        fontStyle: cfg.italic ? 'italic' : 'normal',
        textDecoration: cfg.underline ? 'underline' : 'none'
      }}
    >
      {txt(component.label)}
    </h5>
  );
};

const InfoText: React.FC<{ component: TemplateComponent }> = ({ component }) => (
  <p className="ctv-info-text">{txt(component.label)}</p>
);

/* ------------------------------------------------------------- dispatcher */

export const FieldRenderer: React.FC<FieldProps> = ({ component, groupKey }) => {
  const type = component.component_type;

  // Headings and informational text render without a field label wrapper.
  if (type === 'Heading') return <SubHeading component={component} />;
  if (type === 'Centered Heading') return <CenteredHeading component={component} />;
  if (type === 'Info Text' || type === 'Informational Text') return <InfoText component={component} />;

  const hasOptions = Boolean(component.options && component.options.length > 0);

  let control: React.ReactNode;

  if (type === 'Table') {
    control = <ClinicalTable component={component} groupKey={groupKey} />;
  } else if (type === 'Interpretation' || type === 'Interpretation Block') {
    control = <InterpretationBlock component={component} groupKey={groupKey} />;
  } else if (type === 'Calculated Field' || type === 'Score Field' || type === 'Clinical Score') {
    control = <TextField component={component} groupKey={groupKey} large />;
  } else if (hasOptions && isNestedTree(component.options)) {
    control = <NestedCheckboxGroup component={component} groupKey={groupKey} />;
  } else if (CHECKBOX_TYPES.has(type) && hasOptions) {
    control = <ChoiceGrid component={component} groupKey={groupKey} kind="checkbox" />;
  } else if (RADIO_TYPES.has(type) && hasOptions) {
    control = <ChoiceGrid component={component} groupKey={groupKey} kind="radio" />;
  } else if (LONG_TEXT_TYPES.has(type)) {
    control = <TextField component={component} groupKey={groupKey} long />;
  } else if (type === 'Field Group' || type === 'Nested Field Group') {
    // A group with no options of its own is a labelled container.
    control = hasOptions ? (
      <NestedCheckboxGroup component={component} groupKey={groupKey} />
    ) : null;
  } else if (PLAIN_TEXT_TYPES.has(type)) {
    control = <TextField component={component} groupKey={groupKey} />;
  } else if (hasOptions) {
    // Unknown type that still carries options - show them as a choice grid.
    control = <ChoiceGrid component={component} groupKey={groupKey} kind="radio" />;
  } else {
    control = <TextField component={component} groupKey={groupKey} />;
  }

  return (
    <div className="ctv-field">
      <FieldLabel component={component} />
      {control}
    </div>
  );
};
