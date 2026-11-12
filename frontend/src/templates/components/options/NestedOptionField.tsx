import React, { useMemo } from 'react';
import { TemplateOption } from '../../types';
import { HorizontalOptionTree } from './HorizontalOptionTree';
import {
  buildOptionTreeModel,
  seedSelection,
  selectedLabels,
  toggleSelection
} from './optionSelection';

interface NestedOptionFieldProps {
  options: TemplateOption[] | undefined;
  /** The stored answer: selected labels, comma-separated. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  idPrefix: string;
}

/**
 * A hierarchical option group wired to a saved answer string.
 *
 * The answer is the single source of truth: the selected-id set is derived
 * from it on every render, so there is no second copy of state to drift out
 * of step with what will be saved. Un-ticking an option prunes its whole
 * subtree from the answer too, which is what stops a tick the clinician can
 * no longer see from being submitted as an active finding.
 *
 * The comma-separated label format is the one the form already used for
 * multi-select answers, so nothing on the API or database side changes.
 */
export const NestedOptionField: React.FC<NestedOptionFieldProps> = ({
  options,
  value,
  onChange,
  disabled,
  idPrefix
}) => {
  const model = useMemo(() => buildOptionTreeModel(options), [options]);

  const chosen = useMemo(
    () => new Set(value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []),
    [value]
  );

  const selected = useMemo(
    () => {
      if (chosen.size > 0) {
        return seedSelection(model.tree, (opt) => chosen.has(opt.option_label));
      }
      return seedSelection(model.tree, (opt) => Boolean(opt.is_selected));
    },
    [model.tree, chosen]
  );

  const handleToggle = (optionId: number) => {
    const next = toggleSelection(
      selected,
      optionId,
      model.descendants,
      model.ancestors,
      model.siblings,
      true,
      model.labels
    );
    onChange(selectedLabels(model.tree, next).join(', '));
  };

  return (
    <HorizontalOptionTree
      nodes={model.tree}
      selected={selected}
      onToggle={handleToggle}
      disabled={disabled}
      idPrefix={idPrefix}
    />
  );
};
