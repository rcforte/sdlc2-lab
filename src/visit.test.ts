import {
  ALERT_MESSAGE,
  alertText,
  greetingText,
  isBlank,
  isLogEmpty,
  newVisit,
  submit,
  type Visit,
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

  it('has no greeting text before anything is submitted (INV-10, P1)', () => {
    expect(greetingText(newVisit)).toBe('')
  })

  it('greets the submitted name (INV-10)', () => {
    expect(greetingText(submit(newVisit, 'Ada'))).toBe('Hello, Ada')
  })

  // INV-2′ (trimmed half) / VH-08: "trimmed" is String.prototype.trim() semantics — all
  // leading and trailing JavaScript whitespace, not the space character alone.
  it('greets the trimmed name (INV-2′)', () => {
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

  // INV-13 / R13: a blank submission carries the log through untouched, so the greeting derived
  // from its newest entry is left exactly as it was rather than recomputed or cleared.
  it('leaves an existing greeting untouched when a blank submission is rejected (INV-13)', () => {
    const greeted = submit(newVisit, 'Ada')

    expect(greetingText(submit(greeted, '   '))).toBe('Hello, Ada')
  })

  // INV-2′, non-blank half: no blank entry ever enters the log, so neither "Hello, " with
  // nothing after it nor an empty <li> is reachable.
  it('never greets a blank name (INV-2′)', () => {
    expect(greetingText(submit(newVisit, ''))).toBe('')
    expect(greetingText(submit(newVisit, ' \t '))).toBe('')
  })

  // R9 / INV-9a: without this the aggregate cannot tell a second identical submit from no submit
  // at all, the rendered text never changes, and the live region stays silent on the visitor's
  // second click. The identity now lives in the ledger itself rather than in a counter beside it
  // (ADR-0011): two entries *are* two greetings.
  it('records every greeting, so an identical resubmit is still a new greeting (INV-9a)', () => {
    const once = submit(newVisit, 'Ada')
    const twice = submit(once, 'Ada')

    expect(greetingText(twice)).toBe('Hello, Ada') // same text …
    expect(twice.greetingLog).toEqual(['Ada', 'Ada']) // … two greetings
  })

  // R9 / INV-8b, the alert's half of the same rule, plus its scoping half: a failing submit
  // renews the alert and leaves the log alone, so the status region is never force-mutated to
  // re-announce a greeting that this submission did not produce (R13). No scenario can see this
  // — jsdom implements no live-region announcement — so the domain half is pinned here and the
  // announcement itself is a human check (VH-10).
  it('counts every blank rejection and leaves the greeting log alone (INV-8b, R13)', () => {
    const greeted = submit(newVisit, 'Ada')
    const blank2 = submit(submit(greeted, '   '), '\t')

    expect(blank2.blankCount).toBe(2)
    expect(blank2.greetingLog).toEqual(['Ada']) // the success side is untouched
    expect(greetingText(blank2)).toBe('Hello, Ada')
  })

  // ---------------------------------------------------------------------------------------
  // greeting-log issue 01 — the greeting log. Inner cycles for the rules the DOM can only see
  // indirectly (design.md §5.2).
  // ---------------------------------------------------------------------------------------

  // INV-9a / INV-2′: a successful submission appends exactly one entry — the trimmed name — at
  // the end, leaving every existing entry where it was. No sort, no filter, no dedup, no cap,
  // so "the log is a sequence, not a set" and "oldest first" need no code of their own.
  it('appends one trimmed entry per successful submission, oldest first (INV-9a, INV-2′)', () => {
    expect(newVisit.greetingLog).toEqual([])
    expect(submit(newVisit, 'Ada').greetingLog).toEqual(['Ada'])
    expect(submit(submit(newVisit, ' Ada '), '\tGrace\t').greetingLog).toEqual(['Ada', 'Grace'])
  })

  it('appends a second entry when the same name is submitted twice (INV-9a)', () => {
    expect(submit(submit(newVisit, 'Ada'), 'Ada').greetingLog).toEqual(['Ada', 'Ada'])
  })

  // INV-13: a blank submission appends nothing and removes nothing. Pinned as the *same array
  // reference*, which is sharper than any DOM assertion can be: it also rules out a branch that
  // rebuilds an equal-but-new log, and with it any chance of a blank submission reordering one.
  it('leaves the greeting log untouched when a blank submission is rejected (INV-13)', () => {
    const greeted = submit(newVisit, 'Ada')
    const rejected = submit(greeted, '   ')

    expect(rejected.greetingLog).toEqual(['Ada'])
    expect(rejected.greetingLog).toBe(greeted.greetingLog)
  })

  // INV-12: emptiness is decided in one place. The component asks this predicate which of the
  // log's two DOM shapes to render (P7) and never counts entries for itself; slice 02 gives it
  // its second reader, the clear control's existence (P8), and the two must never disagree.
  it('reports an empty greeting log until the first successful submission (INV-12)', () => {
    expect(isLogEmpty(newVisit)).toBe(true)
    expect(isLogEmpty(submit(newVisit, '   '))).toBe(true)

    expect(isLogEmpty(submit(newVisit, 'Ada'))).toBe(false)
  })

  // INV-10: the greeting *is* the log's newest entry — one fact, two views — so there is nowhere
  // else for greeting text to come from. Built as a literal rather than through submit(), which
  // is what makes this discriminating: an implementation that greeted a separately stored name
  // would have nothing to read here, and could drift from the log the moment either changed
  // without the other (ADR-0011).
  it('greets the newest entry in the greeting log (INV-10)', () => {
    const twoGreetings: Visit = {
      greetingLog: ['Ada', 'Grace'],
      lastSubmissionWasBlank: false,
      blankCount: 0,
    }

    expect(greetingText(twoGreetings)).toBe('Hello, Grace')
    expect(greetingText({ ...twoGreetings, greetingLog: [] })).toBe('')
  })
})
