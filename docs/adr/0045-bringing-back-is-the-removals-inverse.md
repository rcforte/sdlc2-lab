# ADR-0045 — Bringing back is the removal's exact inverse, so the five-name limit is inherited, not re-checked

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `undo-a-removal` (`.sdlc2/features/undo-a-removal/design.md` §2.3, §2.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0007 (invariants arrive whole), ADR-0027 (refusal as data), ADR-0035 (a saved
  name is a record with name-only identity), ADR-0042 (the entry is restored whole), ADR-0043 (the
  offer ends rather than refuses), ADR-0044 (one writer for the list and the offer)

## Context

`save` owns INV-17: at most five names, no duplicates, and a name never moves once it is in the list.
This feature adds a **second way for a name to enter the list**, and the seed is explicit that it must
not be a save (ADR-0042) and must not be able to refuse (ADR-0043). So the obvious question is asked
of it anyway: what stops `bringBack` from putting a sixth name in a five-name list, or a second Ada
beside the first?

The seed answers in one line — *"The five-name limit is never at risk on this path, and not because
anything checks it: the removal freed exactly one slot, and any save since would have ended the
offer"* — and the po adds the structural argument. That settles **what the code does**. What it does
not settle, and what a reader will ask, is **who owns INV-17 now**, and whether "nothing checks it" is
a hole with a nice story told over it.

## Options considered

1. **Check the limit inside `bringBack` and refuse.** *Rejected*, and ADR-0043 rejects it first: the
   offer never refuses, and a third refusal kind would need agreed copy that says only *"you moved the
   list yourself, a moment ago"*.

2. **Check the limit inside `bringBack` and silently do nothing.** *Rejected, and it is the worse
   half of option 1.* It produces the exact failure the seed rules out — a control that is visible and
   does nothing when pressed. Unreachable code that, if it ever *were* reached, would fail in the most
   confusing way available.

3. **Clamp: drop the oldest name to make room.** *Rejected outright.* Undo would then destroy a row
   the visitor never asked to lose, in the one command whose entire promise is that the list is as it
   was.

4. **Remember a snapshot of the whole list as it stood before the removal, and restore that.**
   *Rejected, and it is the near miss* — it is the most literal reading of *"the list afterwards is
   the list that was there before"*, it needs no index arithmetic, and it makes the limit trivially
   safe because the restored value is a value that already satisfied it. Three reasons against.
   First, it contradicts the seed's own definition: a last removal *"remembers the saved name that
   left — text and saved-at moment — and the place it held"*, not the whole list. Second, it stores a
   second copy of state that already exists, and the copy has to be kept alive for the life of the
   offer. Third, and decisively: a snapshot would **silently roll back** any write that slipped past
   ADR-0043's rule, hiding a broken invariant instead of exposing it. A restore that quietly undoes a
   save the visitor made is worse than one that fails loudly in a test.

5. **Remember the name of the preceding row ("put Ada back after Bob") instead of an index.**
   *Rejected.* It buys resilience to a list that moved, which is resilience to a state ADR-0043 says
   cannot happen — paying for the wrong risk — and it has no answer for the first row, so it needs a
   `null`-means-front special case for no gain.

6. **Remember the entry and its index, and make `remove` and `bringBack` literal inverses; take no
   count, and state the inheritance.** *(chosen)*

## Decision

`remove` finds the index once and uses that one value for both halves of what it does: the shortened
list, and the record `{ entry, position }` (INV-35). `bringBack` reinserts at that index and does
nothing else (INV-36):

```ts
[...savedNames.slice(0, position), entry, ...savedNames.slice(position)]
```

**No count, no duplicate check, no clamp.** INV-17 keeps `save` as its single owner. The limit holds
on this path by a chain that is written down in design.md §2.4 rather than assumed: an offer exists
only because `remove` created it, any later write to the list would have replaced it with `null`
(ADR-0044), so the list `bringBack` is handed is *exactly* the list `remove` produced — and
reinserting the removed element at the index it came from reproduces the list value that satisfied
INV-17 immediately before the removal. Same length, same members, same order.

The limit is therefore **inherited by identity of the value**, not enforced a second time. Two tests
keep that from being a story: a unit assertion that `bringBack(remove(v, 'Cleo')).savedNames` deep-
equals `v.savedNames` for a full five-name visit (design.md §5.3), and issue 01's own seam scenario
that removes the fifth name, brings it straight back, and asserts five rows with no `full` refusal.

## Consequences

**Positive**

- `bringBack` is four lines and says one thing. Nothing in it restates a rule that lives elsewhere,
  so there is no second copy of the limit to drift.
- The design's claim is checkable by a reader in one sitting: the chain has three links, each with a
  named owner.
- `remove` becomes easier to read, not harder: one `findIndex` builds both of its outputs, so the row
  it deletes and the row it remembers cannot be different rows.

**Negative / accepted**

- **The safety is non-local.** It depends on ADR-0043 holding, which is a rule enforced in a different
  function. That is stated as a theorem rather than hidden, and five of the guard scenarios in
  design.md §5.1 exist to catch the day someone breaks the premise.
- **`position` is an index, and an index can be stale in principle.** ADR-0042 already named this as
  the one part of the held entry that is not a value of the domain's own making. The floor is that
  `slice` clamps: a stale index degrades to an append, never to a crash or a lost row.
- **`remove` stops being a one-line `filter`.** Its doc comment must stop saying "order is preserved
  because filter preserves it" and start saying "because splitting at the index and rejoining
  preserves it". Same property, different sentence, and a reader who diffs the file will see the
  claim change with the code.

## Related

ADR-0007, ADR-0027, ADR-0035, ADR-0042, ADR-0043, ADR-0044,
`.sdlc2/features/undo-a-removal/design.md` §2.4 (the theorem), §5.3 (the assertions that pin it).
