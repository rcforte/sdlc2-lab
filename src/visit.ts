/** Fixed alert copy. Human-confirmed and shortened — see VERIFY-WITH-HUMAN.md VH-15. */
export const ALERT_MESSAGE = 'Please enter your name.'

/** Fixed empty-state copy (seed, Agreed copy). */
export const NOTHING_SAVED_MESSAGE = 'No name saved yet.'

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
  /**
   * INV-9. The one name this visit is holding onto; null until the first save. Trimmed and
   * non-blank when present — it is a value greetedName already held, so it inherits INV-2
   * rather than re-deriving it.
   */
  readonly savedName: string | null
  /** INV-11. Saves performed this visit. Monotonic; identity, not a quantity to display. */
  readonly saveCount: number
}

/** The state a fresh visit starts from. */
export const newVisit: Visit = {
  greetedName: null,
  greetingCount: 0,
  lastSubmissionWasBlank: false,
  blankCount: 0,
  savedName: null,
  saveCount: 0,
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
    // INV-13: only save() ever writes the saved name or the save count. This branch is an
    // exhaustive literal, so forgetting to carry them is a compile error rather than a silent
    // loss on every greeting. The blank branch spreads, so it carries them for free.
    savedName: visit.savedName,
    saveCount: visit.saveCount,
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

/**
 * INV-9, INV-10, INV-11. Captures the name the visitor is currently greeted as.
 *
 * It takes no name argument, and that absence is the guarantee: the greeting is the only possible
 * source, so no caller can save a name the visitor was never greeted as (ADR-0020). Total — with
 * no greeting there is nothing to save and the visit is returned unchanged. Replacing is not a
 * second code path: the slot is a scalar, so a save with something already in it overwrites.
 * Deliberately not value-idempotent — saveCount advances on every real save, which is what makes
 * saving the same name twice audible instead of silent (INV-11).
 */
export function save(visit: Visit): Visit {
  if (visit.greetedName === null) return visit
  return { ...visit, savedName: visit.greetedName, saveCount: visit.saveCount + 1 }
}

/**
 * INV-12. Greeting again is the same greeting: the one existing transition with the saved name
 * substituted for the field's draft. The body delegates to submit and does nothing else, so
 * re-announcement, the cleared alert, the untouched draft and the advanced greeting count are
 * inherited rather than restated (ADR-0021). A second transition here would be a second, subtly
 * different notion of what a greeting is — and would leave a stale alert standing beneath a
 * fresh greeting. Total: with nothing saved there is nobody to be greeted as, and the visit is
 * returned unchanged. savedName is non-blank by INV-9, so submit always takes its non-blank
 * branch and greeting again can never be rejected as a blank submission.
 */
export function greetAgain(visit: Visit): Visit {
  if (visit.savedName === null) return visit
  return submit(visit, visit.savedName)
}

/**
 * INV-15. The one place the `Saved: ` phrasing exists, so the region and the hint that both show
 * the saved name cannot drift apart. null when nothing is saved.
 */
export function savedNameText(visit: Visit): string | null {
  return visit.savedName === null ? null : `Saved: ${visit.savedName}`
}

/**
 * INV-16. The Saved name region's words. Total, because the region is always rendered (P7): it
 * owns the empty-state decision so that no component ever types either string.
 */
export function savedNameRegionText(visit: Visit): string {
  return savedNameText(visit) ?? NOTHING_SAVED_MESSAGE
}
