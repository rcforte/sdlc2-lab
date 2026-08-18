/** In-memory state of one visit. Replaced wholesale; never mutated. */
export type Visit = {
  /** null until the first successful submission. */
  readonly greetedName: string | null
  /** INV-8a. Greetings produced this visit. Monotonic; identity, not a quantity to display. */
  readonly greetingCount: number
}

/** The state a fresh visit starts from. */
export const newVisit: Visit = {
  greetedName: null,
  greetingCount: 0,
}

/**
 * The only state transition. Total, pure, synchronous. INV-2, INV-8a.
 * Takes the raw string and trims it here, so no caller can bypass the rule.
 */
export function submit(visit: Visit, rawName: string): Visit {
  return { greetedName: rawName.trim(), greetingCount: visit.greetingCount + 1 }
}

/** INV-3. '' when there is no greeting yet — the status region is always rendered (P1). */
export function greetingText(visit: Visit): string {
  return visit.greetedName === null ? '' : `Hello, ${visit.greetedName}`
}
