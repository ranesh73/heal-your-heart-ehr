import React, { useId, useMemo } from 'react';
import { orderTemplateTypes } from '../../constants/templateTypes';

interface TemplateTypeSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  /** Rendered beside the control; hidden visually when `hideLabel` is set. */
  label?: string;
  hideLabel?: boolean;
  id?: string;
  disabled?: boolean;
}

/**
 * Template Type filter.
 *
 * A native <select> is used deliberately: it matches the reference dropdown,
 * is keyboard-navigable and scrollable for free, and on tablets the OS renders
 * its own full-height picker - which matters because this list carries 34
 * entries. Options are flat and in the reference order, with no grouping.
 */
export const TemplateTypeSelect: React.FC<TemplateTypeSelectProps> = ({
  value,
  onChange,
  options,
  label = 'Template Type',
  hideLabel = false,
  id,
  disabled = false
}) => {
  const generatedId = useId();
  const selectId = id || `template-type-${generatedId}`;

  const orderedTypes = useMemo(() => orderTemplateTypes(options), [options]);

  return (
    <div className="control-item">
      <label
        className={hideLabel ? 'visually-hidden' : 'control-label'}
        htmlFor={selectId}
      >
        {label}
      </label>
      <select
        id={selectId}
        className="select-control template-type-select"
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="All">All</option>
        {orderedTypes.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};
