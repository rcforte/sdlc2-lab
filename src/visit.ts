/** Fixed alert copy (po-proposed, unconfirmed — see VERIFY-WITH-HUMAN.md VH-03). */
export const ALERT_MESSAGE = 'Please enter your name to be greeted.'

/** In-memory state of one visit. Replaced wholesale; never mutated. */
export type Visit = {
  /** Trimmed and non-blank when present; null until the first successful submission. */
  readonly greetedName: string | null
  /** INV-8a. Greetings produced this visit. Monotonic; identity, not a quantity to display. */
  readonly greetingCount: number
  /** INV-5a. Whether the most recent submission was blank — never stale, never a component's. */
  readonly lastSubmissionWasBlank: boolean
  /** INV-8b. Blank submissions rejected this visit. Monotonic; same role as greetingCount. */
  readonly blankCount: number
}

/** The state a fresh visit starts from. */
export const newVisit: Visit = {
  greetedName: null,
  greetingCount: 0,
  lastSubmissionWasBlank: false,
  blankCount: 0,
}

/**
 * INV-1. Blank means blank after String.prototype.trim() — all leading and trailing JavaScript
 * whitespace, not the space character alone (VH-08). The only place blankness is decided.
 */
export function isBlank(rawName: string): boolean {
  return rawName.trim() === ''
}

/**
 * The only state transition. Total, pure, synchronous. INV-2, INV-4, INV-5a, INV-8a, INV-8b.
 * Takes the raw string and trims it here, so no caller can bypass the rule.
 *
 * Note which counter each branch leaves alone: that asymmetry is the scoping rule (R9). A
 * blank submission renews the alert only, a successful one renews the greeting only, so a
 * failing submit can never re-announce a stale greeting as feedback for a submission that
 * failed.
 */
export function submit(visit: Visit, rawName: string): Visit {
  if (isBlank(rawName)) {
    // INV-4: greetedName is carried through, never recomputed or cleared.
    return { ...visit, lastSubmissionWasBlank: true, blankCount: visit.blankCount + 1 }
  }
  return {
    greetedName: rawName.trim(),
    greetingCount: visit.greetingCount + 1,
    lastSubmissionWasBlank: false,
    blankCount: visit.blankCount,
  }
}

/** INV-3. '' when there is no greeting yet — the status region is always rendered (P1). */
export function greetingText(visit: Visit): string {
  return visit.greetedName === null ? '' : `Hello, ${visit.greetedName}`
}

/** INV-5b. null when there is no error — the alert element is then absent (P2). */
export function alertText(visit: Visit): string | null {
  return visit.lastSubmissionWasBlank ? ALERT_MESSAGE : null
}
