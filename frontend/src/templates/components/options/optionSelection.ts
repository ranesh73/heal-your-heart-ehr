import { TemplateOption } from '../../types';
import { OptionNode, buildOptionTree } from '../viewer/optionTree';

/**
 * Selection bookkeeping for a hierarchical option group.
 *
 * A selection is a set of option ids. Children are rendered only when their
 * parent is selected, so the set alone decides what the user can see: there
 * is no separate "expanded" flag to keep in step with it.
 *
 * Deselecting an option must take its whole subtree with it. Otherwise a
 * descendant that the user can no longer see would still be submitted as an
 * active answer - the clinic called that out explicitly.
 */

/** Every id beneath `node`, excluding the node itself. */
export function descendantIdsOf(node: OptionNode): number[] {
  const out: number[] = [];
  const walk = (list: OptionNode[]) => {
    for (const child of list) {
      if (typeof child.option.id === 'number') out.push(child.option.id);
      walk(child.children);
    }
  };
  walk(node.children);
  return out;
}

/** Index of option id -> its descendants, for O(1) pruning on deselect. */
export function buildDescendantIndex(tree: OptionNode[]): Map<number, number[]> {
  const index = new Map<number, number[]>();
  const walk = (list: OptionNode[]) => {
    for (const node of list) {
      if (typeof node.option.id === 'number') {
        index.set(node.option.id, descendantIdsOf(node));
      }
      walk(node.children);
    }
  };
  walk(tree);
  return index;
}

/** Index of option id -> its ancestors, nearest first. */
export function buildAncestorIndex(tree: OptionNode[]): Map<number, number[]> {
  const index = new Map<number, number[]>();
  const walk = (list: OptionNode[], trail: number[]) => {
    for (const node of list) {
      const id = node.option.id;
      if (typeof id === 'number') {
        index.set(id, trail);
        walk(node.children, [id, ...trail]);
      } else {
        walk(node.children, trail);
      }
    }
  };
  walk(tree, []);
  return index;
}

/** Index of option id -> its siblings (other options under the same parent) */
export function buildSiblingIndex(tree: OptionNode[]): Map<number, number[]> {
  const index = new Map<number, number[]>();

  const walk = (list: OptionNode[]) => {
    const listIds = list
      .map((n) => n.option.id)
      .filter((id): id is number => typeof id === 'number');

    for (const node of list) {
      const id = node.option.id;
      if (typeof id === 'number') {
        index.set(
          id,
          listIds.filter((otherId) => otherId !== id)
        );
      }
      walk(node.children);
    }
  };

  walk(tree);
  return index;
}

/** Index of option id -> option label (trimmed, lowercased). */
export function buildLabelIndex(tree: OptionNode[]): Map<number, string> {
  const index = new Map<number, string>();
  const walk = (list: OptionNode[]) => {
    for (const node of list) {
      if (typeof node.option.id === 'number') {
        index.set(node.option.id, (node.option.option_label || '').trim().toLowerCase());
      }
      walk(node.children);
    }
  };
  walk(tree);
  return index;
}

/**
 * Toggle one option, pruning its subtree when it is switched off.
 *
 * Switching an option ON selects its ancestors.
 * Default is multi-select across siblings and categories. Mutual exclusion is only
 * enforced when isMultiSelect is false, or between opposite Yes/No root options.
 */
export function toggleSelection(
  selected: ReadonlySet<number>,
  id: number,
  descendants: Map<number, number[]>,
  ancestors: Map<number, number[]>,
  siblings?: Map<number, number[]>,
  isMultiSelect = true,
  labels?: Map<number, string>
): Set<number> {
  const next = new Set(selected);

  if (next.has(id)) {
    // Unselecting this node: remove it and all of its descendants
    next.delete(id);
    for (const child of descendants.get(id) ?? []) next.delete(child);
  } else {
    // Mutual exclusivity handling:
    // If not multi-select, deselect all siblings.
    // If multi-select, only deselect a sibling if this node and the sibling are a mutual Yes/No pair.
    if (siblings) {
      const myLabel = labels?.get(id)?.toLowerCase().trim() ?? '';

      for (const siblingId of siblings.get(id) ?? []) {
        const siblingLabel = labels?.get(siblingId)?.toLowerCase().trim() ?? '';
        const isOppositeYesNo =
          (myLabel === 'yes' && siblingLabel === 'no') ||
          (myLabel === 'no' && siblingLabel === 'yes');

        if (!isMultiSelect || isOppositeYesNo) {
          if (next.has(siblingId)) {
            next.delete(siblingId);
            for (const child of descendants.get(siblingId) ?? []) {
              next.delete(child);
            }
          }
        }
      }
    }

    // Select this node and ensure all its ancestors are selected so it is visible
    next.add(id);
    for (const parent of ancestors.get(id) ?? []) next.add(parent);
  }

  return next;
}

/**
 * Starting selection for a stored template.
 *
 * `isSelected` is supplied by the caller because the two callers answer it
 * differently: the viewer reads the template's own stored ticks, the clinical
 * form reads the consultation's saved answer string. Ancestors are added so a
 * deep stored tick is reachable rather than hidden behind an unselected parent.
 */
export function seedSelection(
  tree: OptionNode[],
  isSelected: (option: TemplateOption) => boolean
): Set<number> {
  const ancestors = buildAncestorIndex(tree);
  const seed = new Set<number>();

  const walk = (list: OptionNode[]) => {
    for (const node of list) {
      const id = node.option.id;
      if (typeof id === 'number' && isSelected(node.option)) {
        seed.add(id);
        for (const parent of ancestors.get(id) ?? []) seed.add(parent);
      }
      walk(node.children);
    }
  };
  walk(tree);

  return seed;
}

/** Labels of the selected options, in tree order - the saved answer format. */
export function selectedLabels(tree: OptionNode[], selected: ReadonlySet<number>): string[] {
  const out: string[] = [];
  const walk = (list: OptionNode[]) => {
    for (const node of list) {
      const id = node.option.id;
      if (typeof id === 'number' && selected.has(id)) out.push(node.option.option_label);
      walk(node.children);
    }
  };
  walk(tree);
  return out;
}

/** Convenience: tree plus all indices, all derived from one options array. */
export interface OptionTreeModel {
  tree: OptionNode[];
  descendants: Map<number, number[]>;
  ancestors: Map<number, number[]>;
  siblings: Map<number, number[]>;
  labels: Map<number, string>;
}

export function buildOptionTreeModel(options: TemplateOption[] | undefined): OptionTreeModel {
  const tree = buildOptionTree(options);
  return {
    tree,
    descendants: buildDescendantIndex(tree),
    ancestors: buildAncestorIndex(tree),
    siblings: buildSiblingIndex(tree),
    labels: buildLabelIndex(tree)
  };
}

