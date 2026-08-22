# ADR-0014 — Clearing is made perceivable by moving focus to the log region, not by announcing it; R9 is scoped to submissions

- **Status:** Proposed — accepted pending the human VERIFY gate; additionally contingent on the
  newly-appended `VERIFY-WITH-HUMAN.md` **VH-06** (the human listening check)
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` R9′, P6, P11, §5.5)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Amends:** ADR-0009 — its requirement stands, its *scope* is stated: R9 constrains **submissions**.
  Its mechanism's storage moves to `greetingLog.length` (ADR-0011). The amendment is recorded in both
  directions: ADR-0009's own Status line has been amended to point here and at ADR-0011, so a reader
  arriving at ADR-0009 first is not left with an accepted decision this feature contradicts.
- **Relates to:** `VERIFY-WITH-HUMAN.md` VH-02 (no `aria-live` on the log), `greet-visitor` VH-09/VH-10

## Context

ADR-0009 adopted R9: *every submit must be perceivable to a screen-reader visitor, without the status
region/alert ever being removed, recreated, or left textless once it holds content.* This feature
introduces an action that **deliberately** leaves the status region textless: clearing restores the
*not-yet-greeted appearance* (Story 2, third scenario, asserted as `toHaveTextContent('')`). So R9 as
written and this feature's contract collide, and the design must say which gives way and what carries
perceivability for the new action.

Two facts constrain the answer:

- The seed rules out an `aria-live` log region directly (*"that would double-announce every greeting
  alongside the status region"*) — VH-02.
- *"A live region emptying announces nothing"* (seed, Decisions). Measured here too (design §5.5):
  clearing does mutate the status region, but the mutation empties it, and an emptied live region is
  silence.

The seed's own answer is the focus move; this record is the design's ruling on why that is the right
mechanism, and on the part of it no test can see.

## Options considered

1. **`aria-live` on the log region**, so the log announces its own changes.
   *Rejected.* The seed forbids it: every successful greeting would be announced twice, once by the
   status region and once by the log. VH-02 already records this and the acceptance criteria
   deliberately assert nothing about the attribute either way.
2. **A "Log cleared" message in the status region.**
   *Rejected.* It contradicts the Contract vocabulary's **Not-yet-greeted appearance** and the seed's
   Decisions (*"it would need a second, different empty message to avoid lying"*). It also invents
   product copy nobody agreed.
3. **Move focus to the Name field** after clearing.
   *Rejected.* It steals the caret into the visitor's unsubmitted draft (which clearing must leave
   alone), announces the field rather than the outcome, and says nothing about the log at all.
4. **Do nothing; let focus fall where it may.**
   *Rejected — and it is the default a developer gets for free.* The clear control is removed by the
   same render, so focus falls to `document.body`: the visitor is dumped at the top of the document
   and hears nothing. Probed in jsdom (design §5.3).
5. **Move focus to the log region**, made programmatically focusable with `tabIndex={-1}`, in the
   click handler, alongside `setVisit(clear)`.
6. **The same, but in a `useEffect` keyed on the log becoming empty.**
   *Rejected.* The effect would also fire on the *first* render (the log starts empty) unless guarded
   by extra state, so it needs a flag to remember that a clear happened — state invented to work
   around the mechanism. The region is guaranteed mounted throughout (P6), so the imperative call in
   the handler is both simpler and exact.

## Decision

Option 5, plus an explicit scoping of R9:

- **R9′:** R9 constrains **submissions**. `clear` is a second command and is exempt from the
  "never left textless" clause, by product decision (Story 2's own acceptance criterion).
- The log region carries `tabIndex={-1}` (not `0` — it must not become a tab stop) and an accessible
  name from its visible `<h2>` via `aria-labelledby`. The clear handler is
  `setVisit(clear); logRegion.current?.focus()`. No `aria-live` anywhere on the log (VH-02).

## Consequences

**Good.**
- Focus lands somewhere real and named, and the destination *is* the thing that changed.
- Verified through the declared seam: `expect(logRegion).toHaveFocus()` — one DOM observation,
  reachable, and it fails against the do-nothing default (option 4).
- No new state, no effect, no extra copy. The `tabIndex={-1}` and the `aria-labelledby` are the only
  two attributes the mechanism needs, and both were probed as load-bearing (design §5.3): without the
  first, `.focus()` is a no-op; without the second, the `<section>` is not even a `region`.

**Bad / accepted.**
- **Whether a screen reader speaks "You have not been greeted yet." on receiving focus is
  AT-dependent and unobservable here** — announcing a focused container's contents differs between
  NVDA, JAWS and VoiceOver. The design guarantees a named, focusable target whose content is *text
  rather than emptiness*; the outcome is a human check at VERIFY (**VH-06**). No jsdom test may be
  manufactured for it.
- `GreetingScreen` gains its first `ref` and its first imperative DOM call. That is a real, if small,
  widening of the adapter — justified because focus is a property of the document, not of the domain,
  so it belongs on this side of the boundary and nowhere else.

## What would change this

A human reporting at VERIFY that the clear is silent or confusing with a real screen reader (VH-06).
The next options in line, in order: give the region `role="status"`-free explicit text the focus
lands on (already the case), or — only if a human confirms the double-announcement cost is
acceptable — revisit VH-02.
