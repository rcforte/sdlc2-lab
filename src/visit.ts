/** Fixed alert copy. Human-confirmed and shortened — see VERIFY-WITH-HUMAN.md VH-15. */
export const ALERT_MESSAGE = 'Please enter your name.'

/** Fixed empty-state copy (seed, Agreed copy). Plural since the visit holds a list. */
export const NOTHING_SAVED_MESSAGE = 'No names saved yet.'

/** Fixed refusal copy for a full list (seed, Agreed copy). */
export const FULL_LIST_MESSAGE = 'Five names is the limit. Remove one to save another.'

/**
 * INV-17. The most names one visit can hold at once. It lives here, beside the rule that
 * enforces it, so no component ever holds the number.
 *
 * Known coupling, stated rather than engineered away: this five and the word "Five" inside
 * FULL_LIST_MESSAGE must agree, and nothing enforces it. Interpolating the number was rejected
 * because the copy is agreed English, not a template (design.md §2.5).
 */
export const SAVED_NAMES_LIMIT = 5

/**
 * INV-20. Why the last save attempt added nothing. Data, never a message: the sentences live in
 * refusalText alone, so no caller can put words the product never agreed into the visit
 * (ADR-0027).
 */
export type SaveRefusal =
  | { readonly kind: 'already-saved'; readonly name: string }
  | { readonly kind: 'full' }

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
   * INV-17. The names this visit is holding onto, oldest first; [] until the first save. No
   * duplicates, at most SAVED_NAMES_LIMIT, and a name never moves once it is in the list. Each
   * entry is trimmed and non-blank when present — it is a value greetedName already held, so it
   * inherits INV-2 rather than re-deriving it.
   */
  readonly savedNames: readonly string[]
  /** INV-20. Why the most recent save attempt added nothing; null when it added a name. */
  readonly lastSaveRefusal: SaveRefusal | null
  /** INV-21. Writes to the list this visit. Monotonic; identity, not a quantity to display. */
  readonly savedNamesRevision: number
}

/** The state a fresh visit starts from. */
export const newVisit: Visit = {
  greetedName: null,
  greetingCount: 0,
  lastSubmissionWasBlank: false,
  blankCount: 0,
  savedNames: [],
  lastSaveRefusal: null,
  savedNamesRevision: 0,
}

/**
 * INV-1. Blank means blank after String.prototype.trim() — all leading and trailing JavaScript
 * whitespace, not the space character alone (VH-08). The only place blankness is decided.
 */
export function isBlank(rawName: string): boolean {
  return rawName.trim() === ''
}

/**
 * The only state transition on the greeting. Total, pure, synchronous. INV-2, INV-4, INV-5a,
 * INV-8a, INV-8b. Takes the raw string and trims it here, so no caller can bypass the rule.
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
    // INV-23: only withSavedNames ever writes the three list fields. This branch is an
    // exhaustive literal, so forgetting to carry one is a compile error rather than a silent
    // loss on every greeting — a blank submission never touching the list, and a greeting never
    // re-announcing the region, both follow from here. The blank branch spreads, so it carries
    // them for free.
    savedNames: visit.savedNames,
    lastSaveRefusal: visit.lastSaveRefusal,
    savedNamesRevision: visit.savedNamesRevision,
  }
}

/**
 * INV-20, INV-21. The only writer of savedNames, lastSaveRefusal and savedNamesRevision — module
 * private on purpose, so the three can never disagree.
 *
 * It takes the new list and the new refusal in one call, which makes a list write without a
 * refusal decision unrepresentable: "clear the message too" is not something save and remove
 * each have to remember (ADR-0027). Every call is a new event, including a refusal that changed
 * nothing — that is what keeps the region from falling silent when the visitor presses Save
 * twice (ADR-0030). Commands that could not do anything return their input by identity and never
 * reach this function, so a press with no possible effect is not counted.
 */
function withSavedNames(
  visit: Visit,
  savedNames: readonly string[],
  refusal: SaveRefusal | null,
): Visit {
  return {
    ...visit,
    savedNames,
    lastSaveRefusal: refusal,
    savedNamesRevision: visit.savedNamesRevision + 1,
  }
}

/**
 * INV-17, INV-18, INV-20, INV-21. Appends the name the visitor is currently greeted as, or
 * refuses and says why.
 *
 * It takes no name argument, and that absence is the guarantee: the greeting is the only possible
 * source, so no caller can save a name the visitor was never greeted as (ADR-0020). Total — with
 * no greeting there is nothing to save and the visit is returned unchanged.
 *
 * The two refusals arrive with the append rather than a slice later, because a live save with one
 * branch missing would let a visitor keep two identical rows or six names in a list whose whole
 * point is that it holds five (ADR-0007). Already-saved is checked first: when the list is full
 * *and* the name is in it, telling the visitor to remove one would send them to make room for a
 * name that is already there (ADR-0027; human check VH-03).
 */
export function save(visit: Visit): Visit {
  const name = visit.greetedName
  if (name === null) return visit
  if (visit.savedNames.includes(name)) {
    return withSavedNames(visit, visit.savedNames, { kind: 'already-saved', name })
  }
  if (visit.savedNames.length >= SAVED_NAMES_LIMIT) {
    return withSavedNames(visit, visit.savedNames, { kind: 'full' })
  }
  return withSavedNames(visit, [...visit.savedNames, name], null)
}

/**
 * INV-19, INV-20, INV-21. Takes exactly the named entry out of the list and leaves every other
 * name where it was.
 *
 * Order is preserved because filter preserves it, not because a second rule says so, and "exactly
 * one" follows from the list holding no duplicates (INV-17) rather than from a count. Total — a
 * name that is not saved is not an error, it is nothing to do, so the visit is returned unchanged
 * and the write is not counted as an event.
 *
 * It cannot break the list's shape: a filter cannot add a name, duplicate one, or reorder the
 * rest, which is why INV-17 still has save as its single owner. It cannot touch the greeting
 * either — the greeting is not one of the fields withSavedNames writes — so "removing does not
 * change who the visitor is greeted as" needs no rule of its own.
 */
export function remove(visit: Visit, name: string): Visit {
  if (!visit.savedNames.includes(name)) return visit
  return withSavedNames(
    visit,
    visit.savedNames.filter((saved) => saved !== name),
    null,
  )
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
 * INV-25. The one place the `Saved: ` phrasing and its `, ` separator exist, so the reminder at
 * the Name field can never name a different set of names, in a different order, from the rows.
 * null when nothing is saved. Its one-name case is the single slot's own sentence, unchanged.
 */
export function savedNamesHintText(visit: Visit): string | null {
  return visit.savedNames.length === 0 ? null : `Saved: ${visit.savedNames.join(', ')}`
}

/**
 * INV-26. The one place either refusal sentence exists; null when the last save attempt was not
 * refused. A switch with no default branch, so a third refusal kind added later is a compile
 * error rather than a silent null the visitor would experience as a button doing nothing.
 */
export function refusalText(visit: Visit): string | null {
  const refusal = visit.lastSaveRefusal
  if (refusal === null) return null
  switch (refusal.kind) {
    case 'already-saved':
      return `${refusal.name} is already saved.`
    case 'full':
      return FULL_LIST_MESSAGE
  }
}
