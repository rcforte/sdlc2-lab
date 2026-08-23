# ADR-0021 — Greeting again is the existing `submit` transition, invoked by `greetAgain`

- **Status:** **Accepted** (2026-08-23, at the human VERIFY gate). The code exists and is merged
  to `main`; the suite is green at 61 tests.
- **Amended by:** **ADR-0029**, which gives `greetAgain` a name argument. This record's decisive
  property was that the command took **no** argument, so no caller could greet as a name that was
  never saved. With five saved names the command has to be told which one, so that guarantee is
  replaced by a membership guard inside the command: it greets only names already in the list. The
  rest of this record stands — greeting again is still the existing `submit` transition and nothing
  else, which is why every consequence of a greeting is still inherited rather than restated. A
  reader arriving here first should read ADR-0029 next.
- **Date:** 2026-08-22
- **Feature:** `saved-name` (`.sdlc2/features/saved-name/design.md` §2.4 INV-12, §3, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0001 (why the greeting and the alert share one transition), ADR-0009
  (re-announcement), ADR-0019, ADR-0020

## Context

The seed states R13 as a decision, not a preference: *"Greeting again is an ordinary greeting. It
runs the one existing state transition with the saved name substituted for the field's draft, so
re-announcement, alert clearing and the untouched field all follow from rules that already exist. A
second, separate transition would be a second, subtly different notion of what a greeting is — and
would leave 'Please enter your name.' standing directly beneath a fresh 'Hello, Ada'."*

That last sentence is ADR-0001's motivating symptom, word for word. So the only real question is
*where* the substitution happens, and what happens when nothing is saved.

Story 2 pins four consequences that a second transition would have to re-derive: the status region
re-announces even when the name is unchanged (`greetingCount`), a standing alert clears
(`lastSubmissionWasBlank := false`), the Name field's draft is untouched, and the saved name does
not change.

## Options considered

1. **A second transition** — `greetAgain` building its own `Visit` literal
   (`{ ...visit, greetedName: visit.savedName, greetingCount: visit.greetingCount + 1, … }`).
   *Rejected.* It is a second definition of "a greeting happened", and the two would drift the first
   time either is edited. Concretely: forget `lastSubmissionWasBlank: false` and Story 2's
   *"greeting again clears a standing blank-name alert"* fails with exactly the screen ADR-0001 was
   written to prevent. Every rule `submit` already owns would need a co-owner, breaking the "one
   invariant, one enforcement point" property of the whole design.

2. **No domain command: the component calls `submit(visit, visit.savedName)` directly.**
   *Rejected.* `savedName` is `string | null`, so the call site must handle the null case, and the
   two obvious handlings are both wrong: `submit(visit, visit.savedName ?? '')` **greets nothing and
   raises a blank-name alert** — an error message for an action the visitor never took — and
   `submit(visit, visit.savedName!)` suppresses the type system's warning instead of the state. The
   guard belongs beside the rule, not in JSX (the same reasoning as ADR-0020's option 3).

3. **A `source` parameter on `submit`** (`submit(visit, name, { from: 'saved' })`), for a future
   need to tell the two apart.
   *Rejected.* Nothing needs to tell them apart — the seed says so explicitly ("greeting again is an
   ordinary greeting"), and no acceptance criterion distinguishes them. It is a parameter with one
   value at every call site, i.e. an abstraction with a cost and no work.

4. **`greetAgain(visit)` in the domain module, whose body delegates to `submit`, plus a null guard
   returning identity.** *(chosen)*

## Decision

```ts
export function greetAgain(visit: Visit): Visit {
  if (visit.savedName === null) return visit
  return submit(visit, visit.savedName)
}
```

`greetAgain` **must** call `submit`; it must not construct a `Visit`. All four of Story 2's
consequences are then inherited, not restated:

| Story 2 requires | Comes free from |
| --- | --- |
| the greeting reads the saved name | `submit`'s non-blank branch (INV-2) |
| it re-announces even when unchanged | `greetingCount + 1` (INV-8a / P4, ADR-0009) |
| a standing alert clears | `lastSubmissionWasBlank: false` (INV-5a) |
| the Name field's draft is untouched | `rawName` is a component hook the domain never sees (INV-6c/INV-7) |
| the saved name does not change | `savedName`/`saveCount` carried through (INV-13) |

`savedName` is non-blank by INV-9 (it is a value `greetedName` held), so `submit` always takes its
non-blank branch — *"greeting again clears a standing blank-name alert"* needs no rule of its own,
and *"greeting again works even when the saved name is already the greeting shown"* is ADR-0009's
keyed child doing its job.

## Consequences

**Positive**

- There is exactly **one** notion of "a greeting happened" in the codebase, with one owner.
- Story 2's eight scenarios cost one four-line function plus one button; five of the eight are
  green for reasons that already existed, which is the point of reuse rather than a gap in it.
- `greetAgain` is total and pure like its neighbours, so it composes and unit-tests identically.

**Negative / accepted**

- **A reader may see `greetAgain` as a pass-through and inline it.** The design (§4.1) and this ADR
  say plainly why it exists: it owns the null guard (INV-12) and it keeps the substitution out of
  JSX. It is not a value-forwarding wrapper of the kind ADR-0009 forbids — it makes a decision.
- **The domain cannot distinguish the two greeting routes**, so if a future requirement ever needs
  to (analytics, "greeted from saved name" wording), it will need a real modelling change rather
  than a flag. Accepted: that requirement does not exist, and the seed rules its nearest neighbours
  out of scope.
- `greetAgain`'s no-op branch is unreachable through the DOM (P11 keeps the control absent), so it
  is covered by one named unit assertion (design §5.3) rather than a scenario.

## Related

ADR-0001, ADR-0009, ADR-0019, ADR-0020, design §2.4 INV-12, §3 (data flow), §4.1, §5.3.
