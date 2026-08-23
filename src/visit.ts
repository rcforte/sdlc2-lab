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

/**
 * INV-27, INV-28. One saved name and the moment it joined the list, in epoch milliseconds.
 *
 * Its identity is `name` alone (ADR-0035): the duplicate check, removal, the greet-again guard
 * and the row's key all compare names and ignore moments. That is a value object whose equality
 * is defined on one of its two fields, which is a trap worth naming — the mitigation is that the
 * comparison happens in exactly one place, `holds` below.
 *
 * `savedAt` is a plain number and deliberately not a branded type: it is constructed at exactly
 * one call site and read by pure functions in this module, so a brand would buy a compile error
 * nobody can currently provoke.
 */
export type SavedName = { readonly name: string; readonly savedAt: number }

/** INV-32. A minute and an hour, in milliseconds, beside the one rule that reads them. */
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

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
   * INV-17, INV-27. The names this visit is holding onto, oldest first, each with the moment it
   * was saved; [] until the first save. No duplicates, at most SAVED_NAMES_LIMIT, and a name
   * never moves once it is in the list. Each entry's name is trimmed and non-blank when present
   * — it is a value greetedName already held, so it inherits INV-2 rather than re-deriving it.
   */
  readonly savedNames: readonly SavedName[]
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
  savedNames: readonly SavedName[],
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
 * INV-28. The one place a name is compared to a saved name — so `===` on the already-trimmed
 * text exists in a single expression instead of once inside each of save, greetAgain and remove,
 * and so "identity is the name alone" cannot come to mean three different things now that entries
 * carry a second field (ADR-0035).
 */
function holds(savedNames: readonly SavedName[], name: string): boolean {
  return savedNames.some((saved) => saved.name === name)
}

/**
 * INV-17, INV-18, INV-20, INV-21, INV-27. Appends the name the visitor is currently greeted as
 * together with the moment it joined the list, or refuses and says why.
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
 *
 * The moment is handed in rather than read here, because this module never reads a clock
 * (INV-33): the reading is taken at the impure edge, which is what keeps every rule in this file
 * a deterministic function of its arguments (ADR-0036).
 *
 * INV-27, and it is structural rather than remembered: this is the only function that ever
 * *constructs* a SavedName, and it does so only in the appending branch. The already-saved branch
 * hands the existing list straight back by reference, so re-saving a name cannot move the moment
 * it already carries — the product's keep-not-refresh decision holds because no code exists that
 * could refresh it, not because anyone remembers a rule. remove filters, and a filter cannot
 * rewrite a field. There is no setter.
 */
export function save(visit: Visit, savedAt: number): Visit {
  const name = visit.greetedName
  if (name === null) return visit
  if (holds(visit.savedNames, name)) {
    return withSavedNames(visit, visit.savedNames, { kind: 'already-saved', name })
  }
  if (visit.savedNames.length >= SAVED_NAMES_LIMIT) {
    return withSavedNames(visit, visit.savedNames, { kind: 'full' })
  }
  return withSavedNames(visit, [...visit.savedNames, { name, savedAt }], null)
}

/**
 * INV-22. Greeting again is an ordinary greeting, as any name the visit is holding onto: the one
 * submission transition, with a saved name where the Name field's draft would be.
 *
 * The body delegates and does nothing else, so every consequence of a greeting is inherited
 * rather than restated here — the status region is renewed even when the name is unchanged, a
 * standing blank-name alert clears, the visitor's draft is untouched, and INV-23 carries the
 * saved names through, so greeting again can neither re-save nor re-announce the list.
 *
 * The membership guard is what survives of ADR-0020's no-argument guarantee now that the
 * signature has had to grow one (ADR-0029): the only names this will greet are names the visitor
 * chose to save, so no caller can smuggle in a name that was never greeted. Entries are non-blank
 * by INV-17 and INV-2, so submit always takes its non-blank branch — "greeting again clears a
 * standing alert" needs no rule of its own. Total: an unsaved name returns the visit unchanged.
 */
export function greetAgain(visit: Visit, name: string): Visit {
  if (!holds(visit.savedNames, name)) return visit
  return submit(visit, name)
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
  if (!holds(visit.savedNames, name)) return visit
  return withSavedNames(
    visit,
    visit.savedNames.filter((saved) => saved.name !== name),
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
  if (visit.savedNames.length === 0) return null
  return `Saved: ${visit.savedNames.map((saved) => saved.name).join(', ')}`
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

/**
 * INV-32. The age reading: one saved-at moment and the current time, in the words a person would
 * actually use. Derived on every render and never stored, so there is no second copy of this
 * answer anywhere for a tick to leave behind.
 *
 * It is a total pure function of two numbers, which is why it can live in this module while the
 * stable absolute time cannot (ADR-0037): an elapsed span is the *difference* of two instants, so
 * it needs no calendar and no timezone, whereas turning one instant into a local wall clock does.
 *
 * Whole units, floored, singular at exactly one. Elapsed is clamped at zero so a `now` earlier
 * than the moment reads "saved just now" rather than a negative age. It never reaches a day: a
 * row that old leaves the list before anyone can read it, so no reading needs the word "day".
 */
export function ageReadingText(savedAt: number, now: number): string {
  const elapsed = Math.max(0, now - savedAt)
  if (elapsed < MINUTE_MS) return 'saved just now'
  if (elapsed < HOUR_MS) return `saved ${counted(Math.floor(elapsed / MINUTE_MS), 'minute')} ago`
  return `saved ${counted(Math.floor(elapsed / HOUR_MS), 'hour')} ago`
}

/** The one place a counted unit is made plural, so the two readings cannot disagree about it. */
function counted(count: number, unit: string): string {
  return count === 1 ? `1 ${unit}` : `${count} ${unit}s`
}

/**
 * INV-29. Which name is the newest — the one with the latest saved-at moment — or null when
 * nothing is saved. What the newest marker marks, and what newest-first sorting will put first:
 * both read the one ordering below, so the two can never disagree about which row is the most
 * recent one, which would be a contradiction in the most visible place available (ADR-0038).
 *
 * The newest is defined by the moment and never by the position in the list. The two agree on
 * every screen a visitor can actually produce, because the clock the transport reads moves
 * forward — but a supplied instant is not something this module can vouch for (ADR-0034), so it
 * trusts the moment rather than the order, which is what "most recent" means (seed, Ubiquitous
 * language).
 */
export function newestSavedName(visit: Visit): string | null {
  return byNewestFirst(visit.savedNames)[0]?.name ?? null
}

/**
 * INV-29, INV-30. The saved names in the order they are to be displayed: the order they were
 * saved in, or the newest first when the visitor has asked for that.
 *
 * Sorting is a view, not a reordering, and this signature is what makes that structural rather
 * than remembered: the choice is an argument to one projection and never a field of the visit, so
 * there is no sorted list for a rule to read. Every other reader — save, remove, greetAgain and
 * the hint at the Name field — goes on reading visit.savedNames, which is written by one function
 * and holds the names in the order the visitor saved them. A sort cannot corrupt the order the
 * rules read, because it never touches it: it returns a new array and stores nothing.
 *
 * The default is the list exactly as it reads today, and deliberately not an ascending sort by
 * moment: the two agree on every screen a visitor can produce, but only save order guarantees
 * that a row never moves unless the visitor asks it to. Only the newest-first view consults
 * moments, and it consults the one ordering the newest marker already reads (ADR-0038), so the
 * marked row and the top row can never be two different rows.
 */
export function savedNamesInView(visit: Visit, newestFirst: boolean): readonly SavedName[] {
  return newestFirst ? byNewestFirst(visit.savedNames) : visit.savedNames
}

/**
 * INV-29. The saved names ordered latest moment first, ties broken in favour of the later save.
 * The one ordering by moment in this module, private so no caller can grow a second definition
 * of "newest" beside it.
 *
 * The reverse before the sort is what settles a tie: Array.prototype.sort is guaranteed stable,
 * so tied entries come out in the order they went in, and reversing first is what makes that the
 * *later* save — the save the visitor made second, which is what they mean by newer.
 *
 * That reverse will read as redundant to anyone who has not hit a tie, so here is the tie: two
 * saves inside one millisecond are enough, and three names saved under a stopped test clock tie
 * exactly. Without the reverse they come back in save order, so the marker would sit on the first
 * name saved rather than the last, and newest-first sorting would display the list oldest first —
 * the opposite of the answer this function exists to give (design.md §5.4, measured).
 *
 * It sorts a copy. The visit goes on holding names in save order, which is what every rule that
 * reads the list sees (INV-30).
 */
function byNewestFirst(savedNames: readonly SavedName[]): readonly SavedName[] {
  return [...savedNames].reverse().sort((a, b) => b.savedAt - a.savedAt)
}
