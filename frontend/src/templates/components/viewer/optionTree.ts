import { TemplateOption } from '../../types';

/** An option plus its resolved children, ready for indented rendering. */
export interface OptionNode {
  option: TemplateOption;
  depth: number;
  children: OptionNode[];
}

/**
 * Rebuild the option hierarchy from the flat rows the API returns.
 *
 * `template_options.parent_option_id` is nullable, so templates authored
 * before nesting existed simply produce a flat list of depth-0 nodes — the
 * renderer handles both without branching.
 *
 * Orphans (a `parent_option_id` pointing at a row that is absent or forms a
 * cycle) are promoted to the root rather than dropped, so a partially
 * corrupt template still displays every option it stores.
 */
let syntheticIdCounter = 900000;

/**
 * Rebuild the option hierarchy from either:
 * 1. Flat list with `parent_option_id` as returned by the API
 * 2. Tree structure where options already carry a `children` array
 */
export function buildOptionTree(options: TemplateOption[] | undefined): OptionNode[] {
  if (!options || options.length === 0) return [];

  // Check if options already carry pre-built children arrays
  const hasEmbeddedChildren = options.some((o) => o.children && o.children.length > 0);

  if (hasEmbeddedChildren) {
    let idGen = 1;
    const ensureId = (opt: TemplateOption): TemplateOption => {
      const id = typeof opt.id === 'number' ? opt.id : idGen++;
      return {
        ...opt,
        id,
        children: opt.children ? opt.children.map(ensureId) : []
      };
    };

    const convertEmbedded = (opts: TemplateOption[], depth = 0): OptionNode[] => {
      return opts.map((opt) => {
        const withId = ensureId(opt);
        return {
          option: withId,
          depth,
          children: withId.children ? convertEmbedded(withId.children, depth + 1) : []
        };
      });
    };

    return convertEmbedded(options);
  }

  // Otherwise rebuild from flat parent_option_id rows
  // Ensure every option has a valid numeric id
  const normalizedOptions: TemplateOption[] = options.map((opt, idx) => ({
    ...opt,
    id: typeof opt.id === 'number' ? opt.id : (idx + 1)
  }));

  const byId = new Map<number, TemplateOption>();
  for (const opt of normalizedOptions) {
    if (typeof opt.id === 'number') byId.set(opt.id, opt);
  }

  /** Walk up the parent chain; returns false if it escapes or loops. */
  const hasReachableRoot = (opt: TemplateOption): boolean => {
    const seen = new Set<number>();
    let cursor: TemplateOption | undefined = opt;
    while (cursor) {
      if (typeof cursor.id === 'number') {
        if (seen.has(cursor.id)) return false; // cycle
        seen.add(cursor.id);
      }
      const parentId = cursor.parent_option_id;
      if (parentId === null || parentId === undefined) return true;
      cursor = byId.get(parentId);
      if (!cursor) return false; // dangling parent
    }
    return true;
  };

  const childrenOf = new Map<number | 'root', TemplateOption[]>();
  for (const opt of normalizedOptions) {
    const parentId = opt.parent_option_id;
    const isRoot =
      parentId === null ||
      parentId === undefined ||
      !byId.has(parentId) ||
      !hasReachableRoot(opt);
    const key: number | 'root' = isRoot ? 'root' : (parentId as number);
    const bucket = childrenOf.get(key);
    if (bucket) bucket.push(opt);
    else childrenOf.set(key, [opt]);
  }

  const sortByOrder = (a: TemplateOption, b: TemplateOption) =>
    (a.order_index ?? 0) - (b.order_index ?? 0);

  const build = (key: number | 'root', depth: number): OptionNode[] =>
    [...(childrenOf.get(key) ?? [])].sort(sortByOrder).map((option) => ({
      option,
      depth,
      children: typeof option.id === 'number' ? build(option.id, depth + 1) : []
    }));

  return build('root', 0);
}

/** True when any option in the tree declares a parent or has children — i.e. it is nested. */
export function isNestedTree(options: TemplateOption[] | undefined): boolean {
  if (!options || options.length === 0) return false;
  return Boolean(
    options.some(
      (o) =>
        (o.parent_option_id !== null && o.parent_option_id !== undefined) ||
        (Array.isArray(o.children) && o.children.length > 0)
    )
  );
}

/** Flatten a tree back to a depth-annotated list for simple row rendering. */
export function flattenTree(nodes: OptionNode[]): OptionNode[] {
  const out: OptionNode[] = [];
  const walk = (list: OptionNode[]) => {
    for (const node of list) {
      out.push(node);
      if (node.children.length) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

