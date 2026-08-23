import {
  ALERT_MESSAGE,
  alertText,
  greetAgain,
  greetingText,
  isBlank,
  newVisit,
  save,
  savedNameRegionText,
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
  // saved-name issue 01 — the saved name's own rules. Everything the DOM can see is a scenario
  // in GreetingScreen.test.tsx; only what no scenario can reach lives here (design.md §5.3).
  // -----------------------------------------------------------------------------------------

  // INV-10: save is total. No scenario can reach this, because P6 keeps the control absent until
  // there has been a greeting — the rule exists so that a second caller (or a future control that
  // forgets the condition) cannot invent a saved name out of nothing.
  it('does nothing when there is no greeting to save (INV-10)', () => {
    expect(save(newVisit)).toBe(newVisit)
  })

  // INV-11: every save is a new save, even an identical one. Without the counter the aggregate
  // cannot tell a second save of the same name from no save at all, the rendered text never
  // changes, and the live region falls silent on the visitor's second click. jsdom announces
  // nothing, so the domain half is pinned here and audibility is a human check (VH-02(c)).
  it('counts every save, so saving the same name again is still a new save (INV-11)', () => {
    const greeted = submit(newVisit, 'Ada')
    const once = save(greeted)
    const twice = save(once)

    expect(savedNameRegionText(twice)).toBe('Saved: Ada') // same text …
    expect(twice.saveCount).toBe(2) // … different value
  })

  // -----------------------------------------------------------------------------------------
  // saved-name issue 02 — greeting again. Everything the DOM can see is a scenario in
  // GreetingScreen.test.tsx; only what no scenario can reach lives here (design.md §5.3).
  // -----------------------------------------------------------------------------------------

  // INV-12: greeting again is total. No scenario can reach this, because P11 keeps the control
  // absent until a name is saved — the rule exists so that a second caller (or a future control
  // that forgets the condition) cannot greet the visitor as nothing at all.
  it('does nothing when there is no saved name to be greeted as (INV-12)', () => {
    expect(greetAgain(newVisit)).toBe(newVisit)
  })
})
