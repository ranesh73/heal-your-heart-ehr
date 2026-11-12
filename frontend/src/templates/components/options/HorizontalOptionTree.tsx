import React, { useId, useState } from 'react';
import { OptionNode } from '../viewer/optionTree';
import { txt } from '../viewer/decodeEntities';

export interface HorizontalOptionTreeProps {
  nodes: OptionNode[];
  selected: ReadonlySet<number>;
  onToggle: (optionId: number) => void;
  /** Read-only rendering: ticks still show, clicks do nothing. */
  disabled?: boolean;
  /** Distinguishes checkbox ids when several groups share a page. */
  idPrefix?: string;
}

interface OptionChipProps {
  node: OptionNode;
  selected: ReadonlySet<number>;
  onToggle: (optionId: number) => void;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleCollapse: (optionId: number) => void;
  disabled?: boolean;
  inputId: string;
  className?: string;
}

const OptionChip: React.FC<OptionChipProps> = ({
  node,
  selected,
  onToggle,
  hasChildren,
  isExpanded,
  onToggleCollapse,
  disabled,
  inputId,
  className = ''
}) => {
  const id = node.option.id;
  const checked = typeof id === 'number' && selected.has(id);

  return (
    <div
      className={`hopt-opt ${checked ? 'on' : ''} ${hasChildren ? 'has-children' : ''} ${className}`}
      onClick={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        if ((e.target as HTMLElement).closest('.hopt-arrow')) return;
        if (!disabled && typeof id === 'number') {
          e.preventDefault();
          onToggle(id);
        }
      }}
    >
      <input
        id={inputId}
        type="checkbox"
        className="hopt-check"
        checked={checked}
        disabled={disabled}
        onChange={() => typeof id === 'number' && onToggle(id)}
      />

      <label htmlFor={inputId} className="hopt-label">
        {txt(node.option.option_label)}
      </label>

      {hasChildren && (
        <button
          type="button"
          className={`hopt-arrow ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.option.option_label} options`}
          title={`${isExpanded ? 'Collapse' : 'Expand'} ${node.option.option_label} options`}
          aria-expanded={isExpanded}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (disabled) return;
            if (!checked) return;
            if (typeof id === 'number') {
              onToggleCollapse(id);
            }
          }}
        >
          <span className="hopt-arrow-char" aria-hidden="true">
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>
      )}
    </div>
  );
};

const OptionLevel: React.FC<{
  nodes: OptionNode[];
  selected: ReadonlySet<number>;
  onToggle: (optionId: number) => void;
  collapsedIds: ReadonlySet<number>;
  onToggleCollapse: (optionId: number) => void;
  disabled?: boolean;
  prefix: string;
  depth: number;
}> = ({
  nodes,
  selected,
  onToggle,
  collapsedIds,
  onToggleCollapse,
  disabled,
  prefix,
  depth
}) => {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className={`hopt-level hopt-depth-${depth}`}>
      {/* Sibling options row: horizontally aligned */}
      <div className="hopt-options-wrap hopt-scroll hopt-row-scroll" role="group">
        {nodes.map((node, i) => {
          const id = node.option.id;
          const isSelected = typeof id === 'number' && selected.has(id);
          const hasChildren = Boolean(
            (node.children && node.children.length > 0) || node.option.is_expandable
          );
          const isExpanded =
            isSelected &&
            hasChildren &&
            (typeof id !== 'number' || !collapsedIds.has(id));
          const showChildren = isExpanded && node.children && node.children.length > 0;
          const hasExpandedChild = Boolean(
            showChildren &&
              node.children.some(
                (c) =>
                  typeof c.option.id === 'number' &&
                  selected.has(c.option.id) &&
                  !collapsedIds.has(c.option.id) &&
                  c.children &&
                  c.children.length > 0
              )
          );

          return (
            <div
              key={id ?? i}
              className={`hopt-node ${isSelected ? 'is-selected' : ''} ${hasChildren ? 'has-children' : ''} ${showChildren ? 'is-expanded' : ''} ${hasExpandedChild ? 'has-expanded-child' : ''}`}
              data-option={node.option.option_label}
            >
              <OptionChip
                node={node}
                selected={selected}
                onToggle={onToggle}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                onToggleCollapse={onToggleCollapse}
                disabled={disabled}
                inputId={`${prefix}-${id ?? `d${depth}-${i}`}`}
              />

              {/* Progressive disclosure: child container belongs to and sits directly under its own parent */}
              {showChildren && (
                <div
                  className="hopt-child-branch hopt-child-container"
                  data-parent={node.option.option_label}
                >
                  <OptionLevel
                    nodes={node.children}
                    selected={selected}
                    onToggle={onToggle}
                    collapsedIds={collapsedIds}
                    onToggleCollapse={onToggleCollapse}
                    disabled={disabled}
                    prefix={prefix}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const HorizontalOptionTree: React.FC<HorizontalOptionTreeProps> = ({
  nodes,
  selected,
  onToggle,
  disabled,
  idPrefix
}) => {
  const generatedId = useId();
  const prefix = idPrefix || `hopt${generatedId.replace(/:/g, '')}`;
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  const handleToggle = (optionId: number) => {
    // If unselecting a parent, reset any local collapsed state so it re-opens expanded when selected again
    if (selected.has(optionId)) {
      setCollapsedIds((prev: Set<number>) => {
        if (!prev.has(optionId)) return prev;
        const next = new Set(prev);
        next.delete(optionId);
        return next;
      });
    }
    onToggle(optionId);
  };

  const handleToggleCollapse = (optionId: number) => {
    setCollapsedIds((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  };

  if (!nodes || nodes.length === 0) return null;

  return (
    <div className="hopt-tree-root">
      <OptionLevel
        nodes={nodes}
        selected={selected}
        onToggle={handleToggle}
        collapsedIds={collapsedIds}
        onToggleCollapse={handleToggleCollapse}
        disabled={disabled}
        prefix={prefix}
        depth={0}
      />
    </div>
  );
};
