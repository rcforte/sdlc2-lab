import {
  ageReadingText,
  ALERT_MESSAGE,
  alertText,
  expire,
  greetAgain,
  greetingText,
  isBlank,
  newestSavedName,
  newVisit,
  remove,
  save,
  savedNamesInView,
  submit,
} from './visit'
import visitSource from './visit.ts?raw'

// INV-6b's "no ambient browser global" half is NOT implied by an empty import list: tsconfig
// puts DOM in `lib`, so `localStorage.setItem(...)` typechecks and runs inside a module that
// imports nothing. This lexical guard is what actually catches it (ADR-0008). It catches
// accident and drift, not a determined author — the rest is code review.
const source = visitSource
  .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
  .replace(/\/\/.*$/gm, '') // strip line comments

// saved-at: save now takes the moment the name joined the list, because this module may not read
// a clock (INV-33) — the reading is taken at the impure edge and handed in (ADR-0036). The three
// merged call sites below pass a literal instant and assert exactly what they asserted before:
// that they stayed literal is the evidence the domain is still deterministic.
const AN_INSTANT = 1_700_000_000_000

// The cutoff's own span, spelled out rather than imported: DAY_MS is private to src/visit.ts, and
// a test that imported it would agree with whatever that constant happened to become.
const A_DAY = 24 * 60 * 60 * 1000

describe('Visit', () => {
  it('stays pure: no imports, no top-level mutable state, no ambient browser globals (INV-6b)', () => {
    expect(source).not.toMatch(/^\s*import\s/m)
    expect(source).not.toMatch(/^(let|var)\s/m) // column 0 => module level; locals are fine
    expect(source).not.toMatch(
      /\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|document|window|globalThis|navigator|Date|Math\.random)\b/,
    )
  })

  it('has no greeting text before anything is submitted (INV-3, P1)', () => {
    expect(greetingText(newVisit)).toBe('')
  })

  it('greets the submitted name (INV-3)', () => {
    expect(greetingText(submit(newVisit, 'Ada'))).toBe('Hello, Ada')
  })

  // INV-2 (trimmed half) / VH-08: "trimmed" is String.prototype.trim() semantics — all
  // leading and trailing JavaScript whitespace, not the space character alone.
  it('greets the trimmed name (INV-2)', () => {
    expect(greetingText(submit(newVisit, ' Ada '))).toBe('Hello, Ada')
    expect(greetingText(submit(newVisit, '\tAda\t'))).toBe('Hello, Ada')
  })

  // INV-1 / VH-08: blank means blank after String.prototype.trim() — every kind of leading and
  // trailing JavaScript whitespace, not the space character alone. This one predicate is the
  // only place blankness is decided; no component ever tests it for itself.
  it('is blank when the name is empty or whitespace only, whatever the whitespace (INV-1)', () => {
    expect(isBlank('')).toBe(true)
    expect(isBlank('   ')).toBe(true)
    expect(isBlank('\t')).toBe(true)
    expect(isBlank('\r\n\v\f  ')).toBe(true)

    expect(isBlank('Ada')).toBe(false)
    expect(isBlank(' Ada ')).toBe(false)
    expect(isBlank('\tAda\t')).toBe(false)
  })

  // INV-5b: alert text exists iff the most recent submission was blank. alertText is the sole
  // reader of that flag and the sole producer of the message, so the component never inspects
  // the flag and never types the copy.
  it('has no alert text before anything is submitted (INV-5b)', () => {
    expect(alertText(newVisit)).toBeNull()
  })

  it('reports the blank-name message after a blank submission (INV-5b)', () => {
    expect(alertText(submit(newVisit, ''))).toBe(ALERT_MESSAGE)
    expect(alertText(submit(newVisit, '   '))).toBe(ALERT_MESSAGE)
    expect(alertText(submit(newVisit, '\t'))).toBe(ALERT_MESSAGE)
  })

  // INV-5a arrives whole (ADR-0007): both branches assign the flag, so it always describes the
  // most recent submission. Writing only the blank branch here would ship a slice in which an
  // alert lingers beside a fresh greeting, still aria-describedby-linked to a field that just
  // succeeded — the defect slice 03 would then be "discovering".
  it('clears the alert on the next successful submission (INV-5a)', () => {
    const rejected = submit(newVisit, '   ')

    expect(alertText(submit(rejected, 'Grace'))).toBeNull()
  })

  // INV-4 / R4: a blank submission carries greetedName through untouched, so an existing
  // greeting is left exactly as it was rather than recomputed or cleared.
  it('leaves an existing greeting untouched when a blank submission is rejected (INV-4)', () => {
    const greeted = submit(newVisit, 'Ada')

    expect(greetingText(submit(greeted, '   '))).toBe('Hello, Ada')
  })

  // INV-2, non-blank half: greetedName is never assigned a blank value, so the screen can never
  // reach "Hello, " with nothing after it.
  it('never greets a blank name (INV-2)', () => {
    expect(greetingText(submit(newVisit, ''))).toBe('')
    expect(greetingText(submit(newVisit, ' \t '))).toBe('')
  })

  // R9 / INV-8a: without this the aggregate cannot tell a second identical submit from no
  // submit at all, the rendered text never changes, and the live region stays silent on the
  // visitor's second click. The count is identity, never a quantity to display.
  it('counts every greeting, so an identical resubmit is still a new greeting (INV-8a)', () => {
    const once = submit(newVisit, 'Ada')
    const twice = submit(once, 'Ada')

    expect(greetingText(twice)).toBe('Hello, Ada') // same text …
    expect(twice.greetingCount).toBe(2) // … different value
  })

  // R9 / INV-8b, the alert's half of the same rule, plus its scoping half: a failing submit
  // renews the alert and leaves the greeting count alone, so the status region is never
  // force-mutated to re-announce a greeting that this submission did not produce (R4).
  // No scenario can see this — jsdom implements no live-region announcement — so the domain
  // half is pinned here and the announcement itself is a human check (VH-10).
  it('counts every blank rejection and leaves the greeting count alone (INV-8b, R4)', () => {
    const greeted = submit(newVisit, 'Ada')
    const blank2 = submit(submit(greeted, '   '), '\t')

    expect(blank2.blankCount).toBe(2)
    expect(blank2.greetingCount).toBe(greeted.greetingCount)
    expect(greetingText(blank2)).toBe('Hello, Ada')
  })

  // -----------------------------------------------------------------------------------------
  // remembered-names — the saved names' own rules. Everything the DOM can see is a scenario in
  // GreetingScreen.test.tsx; only what no scenario can reach lives here (design.md §5.3).
  // -----------------------------------------------------------------------------------------

  // INV-18: save is total. No scenario can reach this, because P17 keeps the control absent until
  // there has been a greeting — the rule exists so that a second caller (or a future control that
  // forgets the condition) cannot invent a saved name out of nothing. Returned by identity, so a
  // press that could do nothing is not counted as a write either (INV-21).
  it('does nothing when there is no greeting to save (INV-18)', () => {
    expect(save(newVisit, AN_INSTANT)).toBe(newVisit)
  })

  // INV-21: every write to the list is a new event, including a refusal that changes nothing.
  // Without the revision the aggregate cannot tell a refused save from no save at all, the
  // rendered text never changes, and the live region falls silent on the visitor's second press.
  // jsdom announces nothing, so the domain half is pinned here and audibility is a human check
  // (VH-04(b)). Replaces the single-slot INV-11 assertion, whose "two saves of the same name are
  // two saves" is now "the second one is refused, and the refusal is still an event".
  it('counts a refused save as a write of its own, without touching the list (INV-21)', () => {
    const saved = save(submit(newVisit, 'Ada'), AN_INSTANT)
    const refused = save(saved, AN_INSTANT + 60_000)

    expect(refused.savedNames).toEqual(saved.savedNames) // the list is untouched …
    expect(refused.savedNamesRevision).toBe(saved.savedNamesRevision + 1) // … and still an event
  })

  // INV-22: greeting again is only ever greeting again as a name that is saved. No scenario can
  // reach this — a control for an unsaved name is a control that is not on the screen — so the
  // guard is pinned here. It is what keeps ADR-0020's no-argument guarantee alive now that the
  // signature has had to grow one: the argument can only ever name a row the visitor can see.
  // Returned by identity, so a call that could do nothing is not a greeting either (INV-8a).
  it('does nothing when asked to greet again as a name that is not saved (INV-22)', () => {
    const greeted = submit(newVisit, 'Bob')

    expect(greetAgain(greeted, 'Ada')).toBe(greeted)
  })

  // -----------------------------------------------------------------------------------------
  // saved-at — the age reading's boundaries. Every word a visitor actually reads is a scenario
  // in GreetingScreen.test.tsx; what sits here is what no scenario can reach without a
  // sixty-minute test per case, plus one case the screen cannot produce at all (design.md §5.3).
  // -----------------------------------------------------------------------------------------

  // INV-32: the reading changes shape at exactly a minute and exactly an hour, and floors to
  // whole units in between. A scenario proves the words; only this can sit one millisecond
  // either side of a boundary, which is where an off-by-one lives — ">=" written as ">" would
  // leave a row reading "saved just now" a full minute after it was saved.
  it('changes the age reading at exactly a minute and exactly an hour (INV-32)', () => {
    const savedAt = 1_000_000

    expect(ageReadingText(savedAt, savedAt)).toBe('saved just now')
    expect(ageReadingText(savedAt, savedAt + 59_999)).toBe('saved just now')
    expect(ageReadingText(savedAt, savedAt + 60_000)).toBe('saved 1 minute ago')
    expect(ageReadingText(savedAt, savedAt + 119_999)).toBe('saved 1 minute ago')
    expect(ageReadingText(savedAt, savedAt + 120_000)).toBe('saved 2 minutes ago')
    expect(ageReadingText(savedAt, savedAt + 3_599_999)).toBe('saved 59 minutes ago')
    expect(ageReadingText(savedAt, savedAt + 3_600_000)).toBe('saved 1 hour ago')
    expect(ageReadingText(savedAt, savedAt + 7_199_999)).toBe('saved 1 hour ago')
    expect(ageReadingText(savedAt, savedAt + 7_200_000)).toBe('saved 2 hours ago')
  })

  // INV-32, the case the screen cannot produce: the reading is a pure function of two numbers, so
  // it has to answer for a "now" that is earlier than the moment — reachable if a machine's clock
  // is set back between a save and a tick. Elapsed is clamped at zero, so the row reads "saved
  // just now" rather than "saved -1 minutes ago", which is the one thing a visitor must never
  // see. No scenario can reach it: fake timers only move forwards.
  it('reads "saved just now" when now is earlier than the moment, never a negative age', () => {
    const savedAt = 1_000_000

    expect(ageReadingText(savedAt, savedAt - 1)).toBe('saved just now')
    expect(ageReadingText(savedAt, savedAt - 3_600_000)).toBe('saved just now')
  })

  // -----------------------------------------------------------------------------------------
  // saved-at — which name is the newest. The marker a visitor sees is a scenario in
  // GreetingScreen.test.tsx; the two cases here are the ones no scenario can reach, because the
  // only clock the screen has moves forward and never stands still (design.md §5.3).
  // -----------------------------------------------------------------------------------------

  // INV-29: two names can share one moment — a clock with millisecond granularity and a visitor
  // who saves twice quickly is enough — and "the newest" still has to be one name. The later save
  // wins, because that is the one the visitor made most recently. No scenario can pin this:
  // whether two clicks land in the same millisecond is an accident of how fast the machine
  // running the suite happens to be.
  it('breaks a tie between two identical moments in favour of the later save (INV-29)', () => {
    const ada = save(submit(newVisit, 'Ada'), AN_INSTANT)
    const bob = save(submit(ada, 'Bob'), AN_INSTANT)

    expect(newestSavedName(bob)).toBe('Bob')
  })

  // INV-29: the newest name is the latest *moment*, never the last position in the list — the two
  // agree on every screen a visitor can produce, which is exactly why the difference has to be
  // pinned here rather than left to a scenario that could not tell them apart. Reachable in life
  // if a machine's clock is set back between two saves; reachable here because the moment is
  // handed to save rather than read by it (ADR-0036). The domain cannot vouch for a supplied
  // instant and does not try: it trusts the moment, which is what "most recent" is defined as.
  it('reads the newest name from the moment, never from the position in the list (INV-29)', () => {
    const ada = save(submit(newVisit, 'Ada'), AN_INSTANT)
    const bobSavedLaterButStampedEarlier = save(submit(ada, 'Bob'), AN_INSTANT - 60_000)

    expect(newestSavedName(bobSavedLaterButStampedEarlier)).toBe('Ada')
  })


  // -----------------------------------------------------------------------------------------
  // saved-at — the day-old cutoff. A row disappearing is a scenario in GreetingScreen.test.tsx;
  // the two cases here are the ones it cannot see: nothing happening, and the exact millisecond
  // the rule turns over (design.md §5.3).
  // -----------------------------------------------------------------------------------------

  // INV-31: a tick that finds nothing old enough is not a write to the list. No scenario can see
  // "nothing happened" — an unchanged screen looks the same whether the visit was left alone or
  // replaced by an identical copy — and the difference is the whole of "the passage of time is
  // never announced": a new visit object every fifteen seconds would bump the revision, replace
  // the region's nodes and give a screen reader something to say, over and over, forever.
  it('returns the visit by identity when a tick drops nothing (INV-31)', () => {
    const saved = save(submit(newVisit, 'Ada'), AN_INSTANT)

    const ticked = expire(saved, AN_INSTANT + A_DAY - 1)

    expect(ticked).toBe(saved)
    expect(ticked.savedNamesRevision).toBe(saved.savedNamesRevision)
  })

  // INV-31, the millisecond the rule turns over: the cutoff is *older than* a day, so a name
  // exactly a day old stays and one a millisecond past it goes (design.md §4.1). No acceptance
  // criterion sits on that millisecond — inventing a scenario for it would be inventing a
  // criterion — and everywhere else the two readings are indistinguishable, because the screen
  // only looks once a tick and a real clock never lands on the mark.
  it('keeps a name exactly a day old and drops one a millisecond older (INV-31)', () => {
    const saved = save(submit(newVisit, 'Ada'), AN_INSTANT)

    expect(expire(saved, AN_INSTANT + A_DAY)).toBe(saved)

    const expired = expire(saved, AN_INSTANT + A_DAY + 1)
    expect(expired.savedNames).toEqual([])
    // A fall-off leaves through the same door every other write to the list uses, so the region
    // has a new set of contents to announce (INV-21) rather than a row that silently vanished.
    expect(expired.savedNamesRevision).toBe(saved.savedNamesRevision + 1)
  })

  // INV-19: remove is total. No scenario can reach this, because a name that is not saved has no
  // row and therefore no "Remove <name>" control to press — the rule exists so that a second
  // caller cannot make a removal out of nothing. Returned by identity, so a removal that could
  // remove nothing is not counted as a write of the list either (INV-21), and the region is not
  // asked to re-announce contents that did not change.
  it('does nothing when the name to remove is not saved (INV-19)', () => {
    const saved = save(submit(newVisit, 'Ada'), AN_INSTANT)

    expect(remove(saved, 'Zoe')).toBe(saved)
  })

  // -----------------------------------------------------------------------------------------
  // saved-at — the two views of one list. Which order a visitor actually sees is a scenario in
  // GreetingScreen.test.tsx; the one case here is the one no scenario can reach, because the only
  // clock the screen has moves forward and never backwards (design.md §4.1, §5.3).
  // -----------------------------------------------------------------------------------------

  // INV-30: oldest-first is the order the names were *saved*, and never an ascending sort by
  // moment. The two agree on every screen a visitor can produce, which is exactly why a scenario
  // cannot tell them apart — reachable in life if a machine's clock is set back between two saves.
  // The default view is the list as it reads today, so nothing moves under a visitor who never
  // asked for a sort, whatever the moments say; only the newest-first view consults them, and here
  // it answers differently from the positions it was handed.
  it('leaves the default view in save order even when a moment disagrees with it (INV-30)', () => {
    const ada = save(submit(newVisit, 'Ada'), AN_INSTANT)
    const bobSavedLaterButStampedEarlier = save(submit(ada, 'Bob'), AN_INSTANT - 60_000)
    const displayed = (newestFirst: boolean) =>
      savedNamesInView(bobSavedLaterButStampedEarlier, newestFirst).map((saved) => saved.name)

    expect(displayed(false)).toEqual(['Ada', 'Bob']) // save order, not the moments' order …
    expect(displayed(true)).toEqual(['Ada', 'Bob']) // … which the moments happen to agree with
  })

  // INV-19: remove is total. No scenario can reach this, because a name that is not saved has no
  // row and therefore no "Remove <name>" control to press — the rule exists so that a second
  // caller cannot make a removal out of nothing. Returned by identity, so a removal that could
  // remove nothing is not counted as a write of the list either (INV-21), and the region is not
  // asked to re-announce contents that did not change.
  it('does nothing when the name to remove is not saved (INV-19)', () => {
    const saved = save(submit(newVisit, 'Ada'), AN_INSTANT)

    expect(remove(saved, 'Zoe')).toBe(saved)
  })
})
