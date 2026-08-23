# ADR-0038 — One ordering rule owns both the newest marker and the newest-first view

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `saved-at` (`.sdlc2/features/saved-at/design.md` §2.4 INV-29/INV-30, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0004 (component-local state, no store), ADR-0026 (the list inside the
  aggregate), ADR-0028 (identity is the exact string), ADR-0036 (the moment is an instant)

## Context

Two requirements read the same moment for the same purpose. The **newest marker** asks *which name
has the latest moment*; the **newest-first view** asks *what order do the names take when the latest
comes first*. The seed insists they agree — the marker is shown in both views, so a visitor sorting
newest-first sees the marker on the top row, and if the two ever disagreed the screen would
contradict itself in the most visible way available.

The seed also fixes what sorting must **not** be: *"Sorting is a view, not a reordering. The visit
goes on holding names in the order they were saved… Nothing that reads the list — saving, removing,
greeting again, the day-old cutoff, the Name field's hint — sees a sorted list."*

There is a third, quieter problem. Moments can **tie**. Two saves in the same millisecond are
unlikely in a browser and *certain* under fake timers, where a scenario saves Ada, Bob and Cleo
without advancing the clock. A rule with no tie-break leaves "exactly one row carries the marker" and
"rows display Cleo, Bob, Ada" to luck.

## Options considered

1. **Mark the last element and reverse the array for the view** — never look at the moments.
   *Rejected.* It is the smallest code and it is wrong for the reason ADR-0034 already accepted: the
   domain cannot vouch for a supplied instant, so insertion order and moment order can disagree. The
   seed defines newest as *"the latest saved-at moment"*, not "the last one appended". A rule that
   agrees with the definition only when the clock behaves is a rule that will be debugged, not read.

2. **Two independent implementations** — a `max` scan for the marker, a `sort` for the view.
   *Rejected.* Two definitions of "newest", drifting on the first tie or the first refactor, in the
   one place where disagreement is directly visible on screen. This is the invariant-with-two-owners
   failure the design's §2.4 exists to prevent.

3. **Sort the held list** — keep `savedNames` sorted whenever the visitor asks for newest-first.
   *Rejected outright by the seed*, and worth stating why it is dangerous rather than merely
   forbidden: `save` appends, `remove` filters and the hint joins **in the order the list is held**,
   so sorting the list would change what the hint says and where a new row lands, and would make
   INV-17's *"a name never moves once it is in the list"* false for reasons unrelated to saving.

4. **Put the sort flag in the `Visit` aggregate** so the projection can read it from state.
   *Rejected.* It puts a view preference inside the consistency boundary, where every command could
   read it and one eventually would. Keeping it out is what makes "no rule can see a sorted list"
   *unrepresentable* instead of merely prohibited.

5. **One private ordering function, two projections over it, and the flag as screen state.**
   *(chosen)*

## Decision

`byNewestFirst(savedNames)` is a module-private function in `src/visit.ts`:

```
[...savedNames].reverse().sort((a, b) => b.savedAt - a.savedAt)
```

`newestSavedName(visit)` returns its first element's name (or `null`); `savedNamesInView(visit,
newestFirst)` returns it when the flag is set and `visit.savedNames` — save order, unchanged —
otherwise. Both are pure reads that store nothing.

**The tie-break is the `reverse()`.** `Array.prototype.sort` is stable, so reversing first makes the
*later insertion* win an exact tie. That matches the visitor's own sense of "newest" (the save they
made second) and it makes the marker and the view agree on ties by construction rather than by
coincidence. It is not theoretical: measured in this repo, three saves inside one fake instant
display in save order under a plain descending sort, and issue 03's *"Checking 'Newest first'
reorders the display"* fails (design.md §5.4).

**The flag never enters the domain.** `newestFirst` is `useState<boolean>(false)` in
`GreetingScreen`, passed as an argument to one projection. `Visit` has no sort field, so `save`,
`remove`, `greetAgain`, `expire` and `savedNamesHintText` read save order because there is no other
order for them to read.

## Consequences

**Positive**

- The marker and the sort cannot disagree: they are the same list, read at index 0 and read whole.
- Sorting cannot corrupt anything, because nothing is sorted — a new array is produced for the render
  and thrown away. The hint keeps naming names in save order with no rule of its own (INV-25 stands
  verbatim).
- The seed's amendment — *"a row never moves unless the visitor asks it to"* — is enforced by where
  the flag lives, not by discipline.

**Negative / accepted**

- **A new array is allocated on every render while newest-first is on**, including on every tick.
  For at most five rows this is not worth memoising; `useMemo` here would cost more attention than
  the allocation costs cycles.
- **The tie-break is invisible in the common case** and will look like a redundant `reverse()` to a
  reader who has not hit a tie. It carries a comment naming the scenario that fails without it.
- **`byNewestFirst` is private, so the tie-break is asserted through `newestSavedName`** in
  `visit.test.ts` (design.md §5.3) rather than directly. Deliberate: an exported ordering helper is a
  second public definition of newest, which is the thing this record exists to prevent.

## Related

ADR-0004, ADR-0026, ADR-0028, ADR-0036, `.sdlc2/features/saved-at/feature.md` (*Agreed scope*,
*Decisions*).
