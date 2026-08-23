# ADR-0026 — The saved names are an ordered, bounded list inside the existing `Visit` aggregate

- **Status:** Proposed — accepted pending the human VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `remembered-names` (`.sdlc2/features/remembered-names/design.md` §2.3, §2.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Supersedes:** ADR-0019's *shape* (a scalar slot). Its *boundary* argument is not superseded —
  it is re-run below with a list and reaches the same answer. ADR-0019's Status line should be read
  together with this record.
- **Numbering note:** `docs/adr/0010`–`0018` are claimed on the unmerged `slice/greeting-log/*`
  branches; two ADRs with the same number and different slugs merge without a git conflict, a gap
  does not.
- **Relates to:** ADR-0001 (the aggregate), ADR-0004 (where its state lives), ADR-0006 (no driven
  ports), ADR-0007 (invariants arrive whole), ADR-0027, ADR-0029

## Context

The single slot becomes *up to five names, oldest first, never reordered*. Three operations touch
it and all three cross between it and the greeting:

- **Saving** reads `greetedName` and writes the list (append, or refuse).
- **Greeting again** reads the list and drives a submission, which writes `greetedName`.
- **Removing** writes the list and must provably *not* touch the greeting (seed, *Decisions*).

So the question is not "where do we put an array" but "is the list inside the greeting's
consistency boundary". If it is outside, each of those actions becomes a read of aggregate A
followed by a write to aggregate B which must land together for the screen to be truthful, with a
click handler as coordinator — the anti-pattern ADR-0001 refused for `greeting`/`error` and
ADR-0019 refused for the single slot.

Two further constraints decide the lifetime and the shape with it: issue 07 requires a fresh visit
to hold nothing (a fresh visit is one mount of `GreetingScreen` — `greet-visitor` VH-02), and the
list has three properties that must hold at once (no duplicates, at most five, insertion order
preserved), so whatever holds it must be able to refuse a write.

## Options considered

1. **A second aggregate `SavedNames`** with its own state and commands.
   *Rejected.* It has no identity, no lifecycle of its own, and no rule that could be true while
   the greeting's rules are false. What it would create is real: `save` becomes
   read-`Visit`-then-write-`SavedNames`, coordinated in a handler — a transaction spanning two
   aggregates — and the invariant *"a saved name is a name we were greeted as"* would have no
   single owner, because no one object could see both sides. `greetAgain` would need the reverse
   coordination.
2. **A `useState<string[]>` beside the visit in `GreetingScreen`** (plus one for the refusal, plus
   one for the revision counter).
   *Rejected, and it is the tempting one, because it is three lines.* It is the anemic shape: state
   with the rules moved into click handlers, where INV-17 (no duplicates, at most five, order
   preserved) and INV-20 (the refusal never outlives the list) have no home. It also makes three
   pieces of state that must change together changeable separately — the exact hazard INV-20 exists
   to remove — and it makes "a blank submission never touches the list" true by *omission* rather
   than by a rule anyone can point at.
3. **A `Set<string>`, or a `Map<string, …>`, instead of an array.**
   *Rejected.* A `Set` gives no-duplicates for free but tells the reader nothing about order (its
   insertion order is an implementation guarantee that reads as an accident), makes "the sixth is
   refused" awkward to express, and buys deduplication we must *refuse* rather than perform — the
   whole point of R20 is that the second Ada is turned away with a sentence, not silently swallowed.
   A `Map` adds a key nothing needs (ADR-0029: rows are values, not entities).
4. **A context, a store, or a `useReducer` above the screen.**
   *Rejected.* ADR-0004 settled this and the reasoning is unchanged: one consumer, and lifting the
   state changes what "a fresh visit" means to whichever component a test remounts. A store would
   additionally make issue 07's guarantee depend on reset logic rather than on unmounting.
5. **`savedNames: readonly string[]`, `lastSaveRefusal: SaveRefusal | null` and
   `savedNamesRevision: number` as fields of the existing `Visit`.** *(chosen)*

## Decision

`Visit` keeps its four greeting fields and replaces `savedName`/`saveCount` with three fields:
`savedNames`, `lastSaveRefusal`, `savedNamesRevision`. It gains `remove(visit, name)` and keeps
`save(visit)`, `greetAgain(visit, name)` and `submit(visit, rawName)`. The aggregate remains an
**aggregate of one**: one consistency boundary, four public commands, all pure, total and
value-replacing. **No operation in this feature spans two aggregates, because there is still only
one.**

The three list properties are owned by `save` alone (INV-17), because `save` is the only function
that can ever add a name and a filter cannot duplicate, add or reorder.

## Consequences

**Positive**

- `save` reads `greetedName` and writes the list **inside one boundary**, in one pure function, in
  one React state update. Nothing to coordinate, nothing to half-apply. Same for `greetAgain` in
  the other direction, and `remove` cannot reach the greeting at all — which is how R24 is
  enforced by construction rather than by a test.
- **Issue 07 costs nothing.** INV-24 is INV-6a applied to three more fields of a value already held
  in one `useState`. No reset logic, no `useEffect` — which is why that slice is a guard.
- The "no web storage" guarantee needs no new mechanism: the new state has nowhere to go the visit
  did not already have.
- Every invariant still names exactly one enforcement point (design §2.4).

**Negative / accepted**

- **`Visit` now has seven fields.** ADR-0019's tripwire — *split when two fields can change
  independently for reasons that never coincide* — is re-run and still not tripped: the three list
  fields are written together by one private function, and every list command reads or writes a
  greeting field. It will be tripped if a future capability writes the list without reading the
  greeting.
- `submit` must carry three fields through its non-blank branch. Accepted because it is
  compiler-enforced: that branch is an exhaustive object literal, so omitting one fails `tsc`.
- The array is `readonly string[]` by type only; nothing stops a future writer from mutating a copy
  it holds. Accepted — the module is small, pure and lexically guarded (ADR-0008), and a frozen
  array would buy runtime cost for a rule `tsc` already states.
- A future "remember across visits" capability would need a driven port, and this puts the state
  where a port cannot reach it. Deliberate: persistence is explicitly out of scope, and ADR-0006
  records where such a port would attach.

## Related

ADR-0001, ADR-0004, ADR-0006, ADR-0007, ADR-0019, ADR-0027, ADR-0029, ADR-0030,
design §2.3, §2.4, §5.1.
