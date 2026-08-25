# ADR-0044 — The last removal is a field of the visit, written only by the list's own writer

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `undo-a-removal` (`.sdlc2/features/undo-a-removal/design.md` §2.3, §2.4, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0026 (the list lives in the visit), ADR-0027 (save has three outcomes; the
  refusal decision travels with the list write), ADR-0030 (every save attempt and removal is
  perceivable), ADR-0042 (the entry is restored whole), ADR-0043 (the offer ends rather than refuses)

## Context

The seed already decided **where** the memory lives: *"The memory belongs to the visit, not to the
screen… It is a field of the visit like the saved names themselves, written by whatever already owns
writes to the list, so the offer and the list can never disagree."* That is carried forward, not
re-argued.

What it does not decide is **how the field is kept honest**. ADR-0043 makes the offer's correctness
depend on a statement about *another* field: bringing a name back is safe only while the list is
exactly as the removal left it. Two fields that must agree, in a codebase whose whole style is to
make agreement structural rather than remembered, is a boundary question — and it is the one that
decides whether the po's ruling (*a refused save does not end the offer*) is expressible at all.

`src/visit.ts` already answers a question of exactly this shape. `withSavedNames` is a private
function that takes the new list **and** the new refusal in one call, so "clear the message too" is
not something `save` and `remove` each have to remember (ADR-0027). It bumps `savedNamesRevision` on
every call, *including a refusal that changed nothing*, because a repeated refusal must still be
announced (ADR-0030). That second fact is what eliminates two of the tidier options below.

## Options considered

1. **Screen state: a `useState` in `GreetingScreen`.**
   *Rejected — and the seed rejects it first, so this record only says why the seed is right.* It is
   not a view: it drives a write to the list, it must be exact across re-renders, and its own rules
   (replace, end, age) are rules about the list. Held in the component, "the offer ended because the
   list moved" becomes a `useEffect` watching a revision counter — a second source of truth that can
   be one render behind the aggregate it describes, in the one place where being behind means putting
   a name back into a list that has changed.

2. **A second aggregate (an `UndoOffer`), or a second module beside `visit.ts`.**
   *Rejected.* It would make a removal a **two-aggregate transaction**: shorten the list here, record
   the offer there, and hope nothing observes the gap. The two have no independent life — an offer
   with no list is meaningless and a list write must always settle the offer — so the boundary would
   buy nothing and cost the only thing that matters. One aggregate, one transaction.

3. **A field of the visit, with each command spreading it (`{ ...visit, lastRemoval: … }`).**
   *Rejected*, and it is the option a developer reaches for. Nothing forces a command to decide: a
   new list write added later carries the old offer through **by default**, silently, and the failure
   is a name restored into a list that has moved. It also splits the answer across five call sites
   with no single place to read it.

4. **A field of the visit, derived from `savedNamesRevision`**: remember the revision at the moment of
   the removal, and let the offer stand while `visit.savedNamesRevision` still equals it.
   *Rejected, and it is the most elegant of the losers* — "the list is exactly as the removal left it"
   is literally a version comparison, and no other command needs to know the offer exists. It is
   **wrong here for one concrete reason**: a refused save bumps the revision (ADR-0030 — that is how a
   repeated refusal gets announced), so a refusal would end the offer. The po ruled the opposite, and
   ruled it for good reasons: a refusal changes nothing about the list, and if it ended the offer the
   seed's own *"bringing a name back clears a standing refusal"* would describe a state no visitor
   could ever reach. Adopting this option would quietly delete a paragraph of agreed product.

5. **A field of the visit, derived from the identity of the list array**: remember the array `remove`
   produced, and let the offer stand while `visit.savedNames` is still that same object.
   *Rejected.* It gets the refusal case right for free (the refusal branches return the list by
   reference) and every content change wrong-free too — but it makes a **reference comparison** the
   enforcement of a product rule. A future refactor that returns `[...savedNames]` unchanged anywhere
   would end offers silently, with no failing test and nothing to read. It also has to keep the whole
   array alive to compare against, which is ADR-0045's rejected snapshot arriving sideways.

6. **A field of the visit, written *only* by `withSavedNames`, whose signature grows a required
   fourth parameter `lastRemoval: LastRemoval | null`.** *(chosen)*

## Decision

`Visit` gains `lastRemoval: LastRemoval | null`, and

```ts
function withSavedNames(
  visit: Visit,
  savedNames: readonly SavedName[],
  refusal: SaveRefusal | null,
  lastRemoval: LastRemoval | null,   // required — every list write states the offer's fate
): Visit
```

is its **only writer** (INV-34). Because the parameter is required, a list write that forgets the
offer is a compile error. The six answers are fixed in design.md §4.1: `save` appending → `null`;
`save` refusing (either kind) → `visit.lastRemoval` carried; `remove` → the new offer; `expire` when
it drops something → `null`; `bringBack` → `null`. `submit` does not call it and carries the field
through its exhaustive literal (INV-23), which is what makes "greeting again leaves the offer
standing" a compile-checked fact rather than a remembered one.

Option 4's insight survives in a better place: *"the list is exactly as the removal left it"* is not
compared at read time, it is **maintained at write time**, by the one function that can.

## Consequences

**Positive**

- The list and the offer are two fields behind one writer, so they cannot disagree — the seed's own
  stated reason for putting the memory in the visit, made structural.
- A removal is one transaction on one aggregate. No cross-aggregate write, no ordering to reason
  about, nothing to make eventually consistent.
- The refusal rule the po settled is expressible without a special case: the refusal branches already
  return the list *by reference* because a refusal changes nothing, and they now carry the offer for
  the same reason, in the same line.
- The next person to add a list write is asked the question by the compiler, at the moment they can
  still answer it.

**Negative / accepted**

- **A four-argument private function.** Past the point where positional arguments read well, and one
  more list-adjacent concern would make an options object the right answer. Named here as the
  tripwire: **the fifth parameter is the signal to pass a `ListWrite` record instead** — not now, for
  four.
- **Every call site must decide, including two that would rather not care.** `save`'s two refusal
  branches now mention the offer. That verbosity is the mechanism, so it is not to be tidied away
  with a default.
- **The lifecycle cannot ship in halves.** Because the parameter is required, the slice that
  introduces it settles every branch — which is why the slice that tests the lifecycle has no
  production code of its own (design.md §5.1, ADR-0048). That is ADR-0007's trade, taken knowingly for
  the third time.

## Related

ADR-0026, ADR-0027, ADR-0030, ADR-0042, ADR-0043, ADR-0045, ADR-0046,
`.sdlc2/features/undo-a-removal/design.md` §2.3, §2.4, §4.1.
