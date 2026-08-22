# ADR-0011 — The greeting is derived from the log's newest entry; `greetedName` and `greetingCount` are deleted

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` §2.3, §2.4 INV-10, §5.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Supersedes in part:** ADR-0002 — its stored field (`Visit.greetedName`) goes; the
  derive-don't-store *rule* it exists for stands and is applied one level up. ADR-0002's Status line
  has been amended to point here.
- **Amends (mechanism):** ADR-0009 — `greetingCount` and its `key` are replaced by
  `greetingLog.length`; R9's requirement is untouched. ADR-0009's Status line has been amended to
  point here and at ADR-0014.
- **Relates to:** ADR-0002 (derive, don't store — this is that rule applied one level up),
  ADR-0009 (**amended in mechanism, not withdrawn**: R9's success-half identity moves from
  `greetingCount` to `greetingLog.length`), ADR-0010, ADR-0013

## Context

`Visit` currently stores `greetedName` (the submitted, trimmed name) and `greetingCount` (a monotone
counter that exists only so an identical resubmission is a *different* value, so React replaces the
status region's keyed child and the live region speaks — ADR-0009).

This feature adds a log of every greeting. That creates an overlap the design has to rule on,
because the contract pins both sides of it:

- *"The greeting currently shown in the status region **is** the newest entry. One greeting, one
  entry, always"* (seed, Agreed scope), and *"The status region and the log are two views of one
  fact"* (seed, Decisions).
- Clearing must remove the greeting *as a consequence of* emptying the log (Story 2).

Meanwhile `greetingLog.length` already advances on exactly the events `greetingCount` advanced on
(every successful submission and nothing else), so the counter now has a rival that is not a
counter — it is the thing itself.

## Options considered

1. **Keep `greetedName` and add `greetingLog` beside it**, with `submit` writing both and `clear`
   nulling one and emptying the other.
   *Rejected.* Two stored representations of one fact, kept equal by four assignments across two
   commands. The seed's own words — "two views of one fact" — describe a derivation, not a
   synchronisation, and ADR-0002 already refused this exact shape ("precisely the 'second source of
   truth' the seed rules out"). Concretely, it makes "clearing removes the greeting too" a rule a
   future edit can forget: a `clear` that empties the log and leaves `greetedName` set compiles,
   type-checks, and leaves "Hello, Ada" above "You have not been greeted yet." — the lying screen
   the seed's Decisions section says the design exists to prevent.
2. **Keep `greetedName` as the source and derive the log from it.** *Rejected as impossible:* a
   single name cannot reconstruct an ordered, duplicate-preserving history. Named only because it is
   the mirror image of option 1 and shows which of the two facts is the richer one.
3. **Derive the greeting from the log, but keep `greetingCount` for R9.**
   *Rejected.* `greetingCount` and `greetingLog.length` are then provably equal at every moment,
   updated by the same branch — a derived value stored, which is the same defect as option 1 in
   miniature. The counter's only consumer is a React key, and `greetingLog.length` serves it exactly
   (verified: identical resubmit still mutates the status region and only that region — design §5.5).
4. **Derive the greeting from the log; delete both fields.**

## Decision

Option 4. `greetingText(visit)` returns `''` when the log is empty and `` `Hello, ${last entry}` ``
otherwise (INV-10). `Visit.greetedName` and `Visit.greetingCount` are deleted; the status region's
keyed child becomes `<span key={visit.greetingLog.length}>` (P4′). Every exported *function*
signature is unchanged.

## Consequences

**Good.**
- R12 ("the greeting is the newest entry") stops being a rule anybody can break: there is nowhere
  else for greeting text to come from.
- `clear` becomes `{ ...visit, greetingLog: [] }` — one line — and "clearing removes the greeting"
  is structural, not a second assignment.
- The aggregate loses a field: three, not four. `blankCount` stays, because blank submissions leave
  no trace in the log and nothing else can carry INV-8b.
- ADR-0009's requirement (every submit is perceivable) survives intact with a *smaller* mechanism.

**Bad / accepted.**
- Three lines of churn in `src/visit.test.ts`, an inner-cycle file. Measured, not assumed (design
  §5.4): no DOM test changes, the `never writes to web storage` constraint and both fresh-visit
  guards pass unmodified, and `tsc -b` names all three lines.
- One of those three still **passes vacuously at runtime** after the change
  (`expect(blank2.greetingCount).toBe(greeted.greetingCount)` → `undefined === undefined`). Only
  `npm run build` catches it. Called out in the design so slice 01 runs the build, not just the tests.
- `greetingText` now does an array read. Trivial, and it keeps the formatting rule in one place.

## What would change this

A requirement that the *greeting* and the *log* legitimately differ — for example "keep showing the
last greeting after clearing", or a log that excludes the current greeting. Both are explicitly
rejected by the seed today; if either is ever confirmed, the two facts really are two, and option 1
becomes right for the first time.
