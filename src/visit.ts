/** Fixed alert copy. Human-confirmed and shortened — see VERIFY-WITH-HUMAN.md VH-15. */
export const ALERT_MESSAGE = 'Please enter your name.'

/** In-memory state of one visit. Replaced wholesale; never mutated. */
export type Visit = {
  /**
   * INV-9a. The greeting log, oldest first: one entry per successful submission, each trimmed
   * and non-blank (INV-2′). It is the whole record of what this visit produced — the greeting on
   * screen is its newest entry (INV-10) rather than a second, stored copy, and its length is the
   * identity a separate greeting counter used to carry (ADR-0011). Two views, one fact.
   */
  readonly greetingLog: readonly string[]
  /** INV-5a. Whether the most recent submission was blank — never stale, never a component's. */
  readonly lastSubmissionWasBlank: boolean
  /**
   * INV-8b. Blank submissions rejected this visit. Monotonic; identity, not a quantity to
   * display. Unlike greetings, a blank submission leaves no trace in the log, so nothing else
   * can carry it.
   */
  readonly blankCount: number
}

/** The state a fresh visit starts from. */
export const newVisit: Visit = {
  greetingLog: [],
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
 * The visit's first command, and the only one that ever *adds* to the log — `clear` below is the
 * only one that takes away. Total, pure, synchronous. INV-2′, INV-9a, INV-13, INV-5a, INV-8b.
 * Takes the raw string and trims it here, so no caller can bypass the rule.
 *
 * Note what each branch leaves alone: that asymmetry is the scoping rule (R9). A blank
 * submission renews the alert only, a successful one appends to the log only, so a failing
 * submit can never re-announce a stale greeting as feedback for a submission that failed.
 */
export function submit(visit: Visit, rawName: string): Visit {
  if (isBlank(rawName)) {
    // INV-13: the log is carried through by reference — appending nothing and removing nothing
    // is one statement now, because the greeting and the log are one fact.
    return { ...visit, lastSubmissionWasBlank: true, blankCount: visit.blankCount + 1 }
  }
  // INV-9a: exactly one entry, appended at the end, leaving every existing entry where it was.
  // No sort, no filter, no dedup, no cap — "oldest first" and "the same name twice is two
  // entries" fall out of this one expression instead of being rules that could be got wrong.
  return {
    greetingLog: [...visit.greetingLog, rawName.trim()],
    lastSubmissionWasBlank: false,
    blankCount: visit.blankCount,
  }
}

/**
 * The visit's second command (ADR-0013), and the only way an entry ever leaves the log: it
 * removes them all, so there is no partial removal anywhere in the domain and no function here
 * takes an index. INV-9b, INV-11.
 *
 * The greeting goes with them without being mentioned, because it was never stored — it is
 * derived from the newest entry, and there is now none (INV-10). The spread *is* the rest of the
 * guarantee: every field this command must not touch is carried through by construction, so a
 * pending alert survives clearing (VH-03) and the visitor's unsubmitted draft is out of reach
 * entirely — the Name field is not part of a Visit at all (INV-6c).
 *
 * Named for the seed's own word, "Clearing — emptying the log and removing the current greeting
 * with it". Not clearLog, which under-describes it; not reset, which over-describes it.
 */
export function clear(visit: Visit): Visit {
  return { ...visit, greetingLog: [] }
}

/**
 * INV-12. The single predicate for "the greeting log has no entries". The component asks this
 * which of the log's two DOM shapes to render (P7) and whether the clear control exists at all
 * (P8), and never counts entries for itself — two DOM decisions, one place they can be wrong.
 */
export function isLogEmpty(visit: Visit): boolean {
  return visit.greetingLog.length === 0
}

/**
 * INV-10. The greeting is the log's newest entry, derived rather than stored, so the two views
 * of one fact have no way to drift apart and nothing has to keep them equal. '' when the log is
 * empty — the status region is always rendered (P1), textless until the first greeting.
 */
export function greetingText(visit: Visit): string {
  if (isLogEmpty(visit)) {
    return ''
  }
  return `Hello, ${visit.greetingLog[visit.greetingLog.length - 1]}`
}

/** INV-5b. null when there is no error — the alert element is then absent (P2). */
export function alertText(visit: Visit): string | null {
  return visit.lastSubmissionWasBlank ? ALERT_MESSAGE : null
}
