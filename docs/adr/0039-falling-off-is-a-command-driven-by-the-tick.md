# ADR-0039 — Falling off is a domain command driven by the tick, and a tick that drops nothing is not an event

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `saved-at` (`.sdlc2/features/saved-at/design.md` §2.4 INV-31, §3, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0027 (refusal as data; one private writer of the list fields), ADR-0030 (every
  save attempt and removal is perceivable), ADR-0031 (removing moves focus), ADR-0036 (the instant
  crosses the boundary), ADR-0038 (sorting is a projection, not a write)

## Context

The seed asks for two things that pull against each other, in consecutive bullets:

- *"A saved name older than a day falls off the list… It leaves on its own, with the visitor doing
  nothing."* and *"A row falling off is **a write to the list, not a tick**, so it is announced the
  way every other write to the list already is."*
- *"**The passage of time is never announced.**"*

So the screen must be checking the clock continuously and must stay completely silent while doing so,
then speak the moment a check has a consequence. Whatever mechanism is chosen has to make that
distinction structural, because the difference between the two is invisible in jsdom (no live-region
announcement exists to assert) and will only ever be heard by a person.

## Options considered

1. **Filter expired names at render time** — a projection, `visibleSavedNames(visit, now)`, with no
   write at all.
   *Rejected, and it is the smallest change, so its failure matters.* The row would vanish, but the
   list would still hold it: `save` would still refuse a sixth name as *full* while the visitor can
   see four rows, the hint at the Name field would still name a row nobody can see, and nothing would
   ever be announced — three of issue 04's own criteria contradicted at once. The seed's *"a write to
   the list, not a display rule"* is not decoration.

2. **One `setTimeout` per row, scheduled for its 24-hour mark.**
   *Rejected.* Five timers to cancel on every remove, every fall-off and every unmount, each holding
   a closure over a row, for a deadline that is nearly unreachable in practice (the seed says so).
   The bookkeeping is larger than the feature, and a leaked timer is the classic way a component
   starts writing to state after unmount.

3. **Expire inside `save` and `remove`** — clean the list whenever the visitor touches it.
   *Rejected.* It contradicts *"it leaves on its own, with the visitor doing nothing"*: a row would
   sit there stale until the visitor happened to act, and issue 04's scenarios all have the visitor
   doing nothing. It would also give `save` two reasons to change the list.

4. **A separate expiry interval, independent of the age reading's refresh.**
   *Rejected.* Two timers reading the clock at two instants, so the row a visitor sees marked
   `saved 23 hours ago` could already have been dropped by the other timer, or the reverse. One tick,
   one reading, both consumers.

5. **A domain command, `expire(visit, now)`, called from the one existing tick, returning the visit
   by identity when nothing is old enough.** *(chosen)*

## Decision

```
expire(visit, now):
  kept = savedNames.filter(saved => now - saved.savedAt <= DAY_MS)
  kept.length === savedNames.length ? visit : withSavedNames(visit, kept, null)
```

Three properties, each doing a stated job:

- **It goes through `withSavedNames`**, the same private writer `save` and `remove` use, so a
  fall-off bumps `savedNamesRevision` and clears the refusal exactly like every other list write. That
  is what makes it *"announced the way every other write to the list already is"* — no second
  announcement mechanism exists (ADR-0027, ADR-0030).
- **It returns the input by identity when nothing expired.** React bails out of the re-render, no
  revision moves, no DOM node is replaced, and the live region has nothing to speak about. This is the
  structural form of *"the passage of time is never announced"*, and it is the half no scenario can
  see, so it is pinned in `visit.test.ts` (design.md §5.3).
- **The comparison is strict (`>` a day, i.e. keep at `<= DAY_MS`)**, because the rule is *older
  than* a day. A name exactly 24 hours old stays.

The caller is `GreetingScreen`'s single interval (P25): `const n = nowMs(); setNow(n); setVisit(v =>
expire(v, n))` — one clock read feeding both the age reading and the cutoff, so they can never
disagree inside a tick. Nothing calls `focus()` on a tick, so a fall-off moves no focus (issue 04),
in deliberate contrast to the visitor's own removal, which destroys the control that was pressed and
must therefore place focus somewhere (ADR-0031).

## Consequences

**Positive**

- One code path for "the list changed", so every consequence of a list change — the announcement, the
  freed slot, the marker moving to the next-newest, the hint shrinking — is inherited rather than
  re-implemented for expiry. Issue 04's *"frees a slot, exactly like removing does"* needs no rule of
  its own.
- The cutoff is a pure function of a visit and a number: testable with literals, and unable to fire
  early, late or twice for reasons a test cannot reproduce.
- One timer in the whole application, with one cleanup.

**Negative / accepted**

- **A row is dropped at the first tick strictly after its 24-hour mark**, so it can outlive the
  deadline by up to one tick period (15 s). Measured and stated (design.md §5.4, N17) because it
  changes how a scenario must advance the clock: advancing exactly `86_400_000` leaves the row alive.
- **A standing refusal is cleared by a fall-off.** `withSavedNames(kept, null)` is what keeps INV-20
  true — the refusal described a list state that no longer holds — but it means `Five names is the
  limit.` can disappear without the visitor acting. Only reachable after 24 hours. Recorded as VH-05.
- **If focus was inside the row that falls off, it goes to `<body>`.** No criterion covers it, and
  moving focus on a tick would be worse: it would steal the caret from wherever the visitor actually
  is, which is precisely what the "no focus move" criterion is protecting.
- **~5 760 no-op calls a day**, each allocating one `filter` result over at most five elements. The
  identity check is on the *length*, after the filter, so the allocation happens every tick; a
  pre-check (`some(...)`) would avoid it and was not worth a second traversal of a five-element array.

## Related

ADR-0027, ADR-0030, ADR-0031, ADR-0036, ADR-0038, `.sdlc2/features/saved-at/feature.md`
(*Agreed scope*: "A row falling off is a write to the list, not a tick").
