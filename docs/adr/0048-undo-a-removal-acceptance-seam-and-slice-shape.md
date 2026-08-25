# ADR-0048 — The `undo-a-removal` acceptance seam: one entry point, one guard slice, no new component

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `undo-a-removal` (`.sdlc2/features/undo-a-removal/design.md` §5)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0005 (the acceptance seam per slice), ADR-0007 (an invariant arrives whole in
  one slice; guard slices are labelled, not manufactured), ADR-0033 and ADR-0041 (the
  component-extraction tripwire, sharpened), ADR-0044 (the required fourth parameter)

## Context

The project declares one seam — `frontend: React Testing Library + user-event via Vitest (jsdom)`,
`npm test -- --run` — and every slice of every merged feature has been driven through
`render(<GreetingScreen />)` by role and accessible name. Nothing about this feature argues for a
second stack: it adds one button, and every scenario is a press or an absence.

Three questions do need deciding, and two of them are uncomfortable.

**Time.** Ten of the twenty-three scenarios say *"N minutes pass with the visitor doing nothing"* or
set up a name saved hours ago. `saved-at` already paid for this answer: a full `vi.useFakeTimers()`
makes every `await user.click(...)` in the file hang, because React Testing Library's fake-timer
detection only recognises *jest* (ADR-0041, measured in this repo).

**Red-first or guard.** ADR-0044 makes `withSavedNames`' fourth parameter **required**, which means
the slice that introduces it must answer at all six call sites. So the offer's entire lifecycle —
replaced by a removal, ended by a save or a fall-off, surviving a refusal — is present as soon as the
offer is. The issue whose acceptance criteria *test* that lifecycle therefore arrives at a green bar.
That is either a defect in the slicing or a guard slice, and this repo has an answer on file.

**Extraction.** ADR-0041 sharpened the tripwire: *extract `SavedNamesRegion` when a second screen
renders it, or when it owns state that is genuinely about the region.* It also said the next feature
to add screen state should extract rather than re-argue.

## Options considered

**A. How to control time.** Carried from ADR-0041 rather than re-probed: nothing here adds a timer,
and the two rejected recipes there (a `globalThis.jest` shim; dropping `user-event` for `fireEvent`)
are rejected for the same reasons. The merged helpers `timePasses(ms)` and
`expectAgeReading(name, reading)` are reused as they stand.

**B. The lifecycle slice.**

1. **Manufacture a red bar** by having the slice that introduces `withSavedNames`' fourth parameter answer only some of its call
   sites — for example, letting `save`'s append branch carry the offer through — so that the later
   slice's scenarios genuinely fail first. *Rejected.* It ships a knowingly broken rule on `main` for
   the length of a slice, and the break is not cosmetic: the visitor removes Ada, saves Bob, presses
   *Bring Ada back*, and gets a name inserted at a stale index into a list that has moved. ADR-0007
   weighed this exact trade for `greet-visitor` and ADR-0004 refused it again for a smaller leak;
   taking it here and refusing it there would make the design argue with itself.
2. **Merge the lifecycle scenarios into the walking-skeleton slice** so every slice is red-first. *Rejected*
   twice over: the acceptance criteria belong to the issues, which this node does not edit [SD-07],
   and it would make the walking skeleton carry twenty-three scenarios' worth of work in one sitting.
3. **Label it a guard slice, say what each guard kills, and forbid weakening production code to turn
   it red.** *(chosen)* — the precedent is `greet-visitor`, which shipped two (ADR-0005's decision
   table, amended by ADR-0007).

**C. Extract `SavedNamesRegion`?**

1. *Extract now.* *Rejected, for the third time and this time easily.* The tripwire's trigger is
   **state**, and this feature adds none: the offer is a field of the visit (ADR-0044) and its
   availability is derived on render (ADR-0046). The component gains one derived value, one handler
   and one element.
2. *Keep one component; leave the tripwire exactly as ADR-0041 set it.* *(chosen)*

## Decision

**One seam for all three slices:** `src/GreetingScreen.test.tsx`, entry point
`render(<GreetingScreen />)`, queried by role and accessible name. `src/App.test.tsx` gains no `it`
(ADR-0005's tripwire). All **23** acceptance scenarios are driven through it; the per-slice queries
are tabulated in design.md §5.

**Time is controlled exactly as ADR-0041 decided**, in a `describe` for this feature's scenarios:

```ts
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] }))
afterEach(() => vi.useRealTimers())
```

`setTimeout` stays real. One consequence of the stopped clock is load-bearing and must not be
"fixed": consecutive saves share one instant, and the merged tie-break makes the **later** save the
newest — which is what the `Newest` marker scenario assumes.

**The walking-skeleton slice and the ageing slice are red-first. The lifecycle slice is a guard slice
with no production change**, and design.md §5.1 names, for each of its seven scenarios, the specific
wrong implementation it kills — a countdown, a stack of removals, a spread that carries the offer
through a save or a fall-off, a revision-based offer that dies on a refusal, a component-level reset,
and an offer derived from "the last name that left". **Do not weaken production code to manufacture a
red bar there.** If one of those seven fails, the fix belongs in the code introduced by the slice its own
`Blocked by:` line points at.

**Three unit assertions** join `src/visit.test.ts` (design.md §5.3): the remove/bring-back inverse on
a full list, `bringBack`'s identity return when no offer stands, and the day-old boundary at exactly
`DAY_MS`. Each is unreachable or disproportionately expensive through the DOM. **No new test file, no
new constraint test, and no merged test is edited by this feature.**

**No new component.** The tripwire stands as ADR-0041 left it.

**The queue lives in `issues/`.** This ADR names no `Blocked by:` edge; where a slice's dependencies
matter above, they are phrased against *the branch its own `Blocked by:` line gives it* [SD-07].

## Consequences

**Positive**

- One entry point, one query style, one interaction style; nothing about this feature's tests is
  special except the two lines that fake the clock, which are already in the file twice.
- The guard slice is a genuine regression net rather than a formality: every one of its seven
  scenarios fails against a named, plausible implementation, and five of them protect the non-local
  argument ADR-0045 depends on.
- The extraction question is answered in one line instead of a fourth debate, because the trigger
  ADR-0041 chose — state — turned out to discriminate.

**Negative / accepted**

- **A slice with no production diff will look wrong to a developer node** and to anyone reading the
  branch afterwards. It is labelled here, in design.md §5.1, and in the slice table, which is the most
  that can be done short of editing an issue this node may not edit.
- **`GreetingScreen.test.tsx` passes roughly 130 scenarios** and `GreetingScreen.tsx` roughly 175
  lines of JSX. Both are past comfortable and neither moved much this round; the next feature that
  adds screen state should extract.
- **The seam still cannot hear anything.** Whether the offer is announced on arrival, and silent on
  ending, stays a human check (VH-02) — and this feature makes the silent half harder, because the
  offer's disappearance is a real change to a live region's contents rather than an `aria-hidden` one.

## Related

ADR-0004, ADR-0005, ADR-0007, ADR-0033, ADR-0041, ADR-0044, ADR-0046,
`CLAUDE.md` (the declared stack, seam and commands), `.sdlc2/features/undo-a-removal/design.md` §5.
