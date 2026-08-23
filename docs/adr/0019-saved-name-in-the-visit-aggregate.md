# ADR-0019 — The saved name is a field of the existing `Visit` aggregate

- **Status:** **Accepted** (2026-08-23, at the human VERIFY gate). The code exists and is merged
  to `main`; the suite is green at 61 tests.
- **Superseded in part by:** **ADR-0026**, which replaces the single scalar slot decided here with
  an ordered list of up to five. Only the *shape* is superseded. This record's **boundary** argument
  — that the saved name belongs inside the `Visit` consistency boundary rather than in a second
  aggregate — is not: ADR-0026 re-runs it with a list and reaches the same answer for the same
  reasons. A reader arriving here first should read ADR-0026 next.
- **Date:** 2026-08-22
- **Feature:** `saved-name` (`.sdlc2/features/saved-name/design.md` §2.3, §2.4 INV-9/INV-11/INV-14)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Numbering note:** this feature's ADRs start at 0019 because `docs/adr/0010`–`0018` already
  exist on the unmerged `slice/greeting-log/*` branches. Two ADRs with the same number and
  different slugs merge without a git conflict; a numbering gap does not.
- **Relates to:** ADR-0001 (the aggregate this extends), ADR-0004 (where its state lives),
  ADR-0006 (no driven ports), ADR-0007 (invariants arrive whole)

## Context

The feature adds one new fact to the screen: **the one name the visit is holding onto**. Two
operations touch it, and both cross between it and the greeting:

- **Saving** *reads* the greeting (`greetedName`) and *writes* the saved name. The seed is emphatic
  that it captures the greeting and never the Name field.
- **Greeting again** *reads* the saved name and drives the greeting.

So the question is not "where do we put a string" but "is the saved name inside the greeting's
consistency boundary or outside it". If it is outside, every save is a read of one aggregate
followed by a write to another — the two must land together or the screen lies — and the component
becomes the coordinator of a two-aggregate transaction. That is the exact anti-pattern ADR-0001
already refused once for `greeting`/`error`.

A second constraint decides the lifetime question with it: Story 5 requires a fresh visit to have
nothing saved, and `greet-visitor` VH-02 defines a fresh visit as one mount of `GreetingScreen`.

## Options considered

1. **A second aggregate `SavedName`** (or `Bookmark`), with its own command and its own state.
   *Rejected.* It has no identity, no lifecycle of its own, and no rule that could be true while
   the greeting's rules are false — the three things that would justify a separate consistency
   boundary. What it *would* create is real: `save` becomes read-`Visit`-then-write-`SavedName`,
   coordinated in a click handler, i.e. a transaction spanning two aggregates. Every invariant that
   relates the two ("the saved name is a name we were greeted as") would then have no single owner,
   because no one object can see both sides.

2. **A third `useState<string | null>(null)` in `GreetingScreen`.**
   *Rejected — and this is the tempting one, because it is four characters of code.* It is the
   anemic shape: state with no rules attached. The rules would move into the click handler
   (`if (greetedName !== null) setSavedName(greetedName)`), where INV-9/INV-10 have no home, and a
   second entry point later would have to re-derive them correctly. It also splits R16 across two
   hooks for no gain, and it makes "a blank submission never touches the saved name" true by
   *omission* — nobody wrote the line — rather than by a rule anyone can point at.

3. **A context, a store, or a `useReducer` above the screen.**
   *Rejected.* ADR-0004 already settled this for the visit and the reasoning is unchanged: there is
   exactly one consumer, and lifting the state changes what "a fresh visit" means to whichever
   component the test remounts. A store would additionally make the fresh-visit guarantee depend on
   reset logic instead of on unmounting.

4. **Fields on the existing `Visit` aggregate: `savedName: string | null` and
   `saveCount: number`.** *(chosen)*

## Decision

`Visit` gains two fields — `savedName: string | null` (INV-9) and `saveCount: number` (INV-11) —
and two commands, `save(visit)` and `greetAgain(visit)`, alongside the existing `submit`. The
aggregate stays an **aggregate of one**: one consistency boundary, three commands, all pure and
total, all replacing the value wholesale. **No operation in this feature spans two aggregates**,
because there is still only one.

"At most one saved name" is enforced by the *type*: a scalar slot, not a collection. Replacing is
therefore not a second code path — it is what writing a scalar does (R12).

## Consequences

**Positive**

- `save` reads `greetedName` and writes `savedName` **inside one boundary**, in one pure function,
  in one React state update. There is nothing to coordinate and nothing to half-apply.
- **Story 5 costs nothing.** INV-14 ("the saved name dies with the mount") is not new work: it is
  INV-6a applied to two more fields of a value that already lives in one `useState`. No reset
  logic, no `useEffect`, no cleanup — which is why slice 05 is a guard slice (design §5.1).
- The "no web storage" guarantee is unchanged and needs no new mechanism: the new state has nowhere
  to go that the visit did not already have.
- The invariant table keeps its property that **every invariant names exactly one enforcement
  point** — `save` owns INV-9/INV-10/INV-11, `submit` owns INV-13, and no rule is shared.

**Negative / accepted**

- `Visit` now has six fields, and will have more if `greeting-log` merges. Accepted for now: they
  are four scalars and two counters, all written by one function each, and the aggregate is still
  smaller than the component that renders it. The tripwire, so this is a decision and not drift:
  **split when two fields can change independently for reasons that never coincide** — that is what
  a second aggregate is *for*, and it is not true of any pair here.
- `submit` must carry the two new fields through its non-blank branch. Accepted because it is
  compiler-enforced: that branch is an exhaustive object literal, so omitting them fails `tsc`
  (INV-13).
- A future "remember across visits" capability would need a driven port, and this decision puts the
  state where a port cannot reach it. That is deliberate — persistence is explicitly a different
  feature (seed, *Out of scope*), and ADR-0006 already records where such a port would attach.

## Related

ADR-0001, ADR-0004, ADR-0006, ADR-0007, ADR-0020 (the command's signature), ADR-0021 (the second
command), design §2.3, §2.4, §5.1.
