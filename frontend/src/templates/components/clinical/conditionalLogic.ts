import { ClinicalTemplate, TemplateComponent, TemplateRelationship } from '../../types';

/**
 * Conditional-visibility engine shared by the template Preview and the
 * patient Consultation screen.
 *
 * The rule, stated once:
 *
 *   A question is HIDDEN only if it is the child of at least one rule and
 *   none of those rules is currently satisfied.
 *
 * Everything else stays visible. That gives the behaviour the clinic asked
 * for: answering "No" collapses that branch, while independent screening
 * questions are untouched and keep their place in the form.
 *
 * Chains resolve transitively - if B is revealed by A and C is revealed by B,
 * then C stays hidden while A is unanswered, because B is not visible yet.
 */

export interface VisibilityResult {
  /** Component ids that should render right now. */
  visible: Set<number>;
  /** Component ids suppressed because their parent branch is closed. */
  hidden: Set<number>;
}

/** Case-insensitive, whitespace-tolerant answer match. */
function answerMatches(given: string | undefined, trigger: string): boolean {
  if (given === undefined || given === null || given === '') return false;
  const want = trigger.trim().toLowerCase();
  // Multi-select answers are stored comma-separated.
  return given
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .some((v) => v === want);
}

export function computeVisibility(
  components: TemplateComponent[],
  relationships: TemplateRelationship[],
  answers: Record<number, string>
): VisibilityResult {
  const allIds = components
    .map((c) => c.id)
    .filter((id): id is number => typeof id === 'number');

  // Children with at least one governing rule.
  const rulesByChild = new Map<number, TemplateRelationship[]>();
  for (const rel of relationships) {
    const child = rel.child_component_id;
    if (typeof child !== 'number') continue;
    const list = rulesByChild.get(child);
    if (list) list.push(rel);
    else rulesByChild.set(child, [rel]);
  }

  const visible = new Set<number>(allIds.filter((id) => !rulesByChild.has(id)));

  // Iterate to a fixed point so chained rules resolve. Bounded by the number
  // of conditional children, which also makes a cyclic rule set terminate
  // safely (the cycle simply never becomes visible).
  const maxPasses = rulesByChild.size + 1;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;

    for (const [childId, rules] of rulesByChild) {
      if (visible.has(childId)) continue;

      const satisfied = rules.some((rel) => {
        const parentId = rel.parent_component_id;
        // A rule can only fire if its parent is itself on screen.
        if (typeof parentId !== 'number' || !visible.has(parentId)) return false;
        return answerMatches(answers[parentId], rel.trigger_value);
      });

      if (satisfied) {
        visible.add(childId);
        changed = true;
      }
    }

    if (!changed) break;
  }

  const hidden = new Set<number>(allIds.filter((id) => !visible.has(id)));
  return { visible, hidden };
}

/** Flatten a template's sections into a single component list. */
export function allComponentsOf(template: ClinicalTemplate): TemplateComponent[] {
  return (template.sections || []).flatMap((s) => s.components || []);
}

/**
 * Drop answers belonging to questions that are no longer visible.
 *
 * Called after every answer change so that switching a parent from "Yes" to
 * "No" also clears the follow-ups underneath it — otherwise a stale answer
 * would be saved for a question the clinician can no longer see.
 */
export function pruneHiddenAnswers(
  answers: Record<number, string>,
  hidden: Set<number>
): Record<number, string> {
  let mutated = false;
  const next: Record<number, string> = {};

  for (const [key, value] of Object.entries(answers)) {
    if (hidden.has(Number(key))) {
      mutated = true;
      continue;
    }
    next[Number(key)] = value;
  }

  return mutated ? next : answers;
}

/** Questions revealed by a given parent answering a given trigger. */
export function childrenOf(
  relationships: TemplateRelationship[],
  parentId: number,
  trigger?: string
): number[] {
  return relationships
    .filter(
      (r) =>
        r.parent_component_id === parentId &&
        (trigger === undefined || r.trigger_value === trigger)
    )
    .map((r) => r.child_component_id);
}
