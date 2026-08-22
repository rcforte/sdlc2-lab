# ADR-0013 — `clear` is a second command on `Visit` that empties the log and touches nothing else

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` §2.4 INV-9b/INV-11, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0001 (one aggregate, one command — this adds the second), ADR-0003 (rules live
  in the pure module), ADR-0011 (why removing the greeting needs no code), `VERIFY-WITH-HUMAN.md`
  VH-03

## Context

Until now the aggregate had exactly one command, `submit`. Clearing is a second visitor action with
a different rule set, and the contract is unusually precise about its *edges* — what it must **not**
do:

- It empties the log and removes the current greeting (Story 2, third scenario).
- It leaves the Name field's draft alone (fifth scenario) — *"the field holds the visitor's draft,
  not a greeting"*.
- It leaves a pending alert on screen (eighth scenario, and VH-03): the alert is dismissed only by a
  subsequent submission.
- It is not a mode: a greeting after clearing behaves exactly as the first greeting of the visit
  (seventh scenario).

So the design decision is where that rule set lives, and how the three "must not" edges are made
hard to violate rather than merely tested.

## Options considered

1. **`clear` returns `newVisit`** ("clearing restores the arrival state").
   *Rejected.* It reads like the seed's phrase *"returning the screen to its not-yet-greeted
   appearance"*, and it is wrong: `newVisit` also resets `lastSubmissionWasBlank` and `blankCount`,
   which dismisses a pending alert. That contradicts Story 2's eighth scenario, VH-03's decision,
   and `greet-visitor`'s rule that only a submission changes the alert. It is the single most likely
   wrong implementation, which is why it is named here rather than left to be discovered.
2. **Clear inline in the component**: `setVisit(v => ({ ...v, greetingLog: [] }))` in the click
   handler.
   *Rejected.* It puts a domain transition in the adapter — the anemic shape ADR-0003 rejected — and
   it makes the component a second construction site for `Visit` values, breaking INV-9c ("no third
   writer"). It is also untestable except through a render.
3. **A general `apply(visit, event)` reducer** taking a discriminated union of events.
   *Rejected as premature.* Two commands do not need a dispatcher; it would add a layer whose only
   inhabitants are two five-line functions, and it makes each transition harder to unit-test than a
   named function call. Revisit if a fourth command ever appears.
4. **A named command `clear(visit): Visit` in `src/visit.ts`.**

## Decision

Option 4:

```ts
export function clear(visit: Visit): Visit {
  return { ...visit, greetingLog: [] }
}
```

The name is the seed's own word (*"**Clearing** — emptying the log and removing the current greeting
with it"*). Not `clearLog` (under-describes: the greeting goes too), not `reset` (over-describes:
the alert and the draft stay).

## Consequences

**Good.**
- The spread **is** the guarantee: every field this command must not touch is carried through by
  construction, so INV-11 has one owner and one line (VH-03 honoured structurally).
- The greeting disappears without being mentioned, because it was never stored (ADR-0011).
- `clear` is total, pure and idempotent (`clear(clear(v))` equals `clear(v)`), which is the domain
  half of "clearing is not a mode a screen gets stuck in" — unit-asserted in `src/visit.test.ts`.
- The Name field is unreachable from the domain: it is not in `Visit` at all (INV-6c).

**Bad / accepted.**
- `Visit` now has two commands and the module two writers, so INV-9c ("construction happens in
  exactly three places: `newVisit`, `submit`, `clear`") is a rule a reviewer counts rather than one
  the compiler enforces.
- The one-line body will look like a candidate for inlining to anyone who has not read this record;
  the header comment in the module points here.

## What would change this

A confirmed requirement that clearing *also* dismisses the alert (VH-03's "what would change my
mind"). That is option 1 becoming correct — and it would arrive with its own scenario, since it
changes blank-submission behaviour, which today is Out of scope.
