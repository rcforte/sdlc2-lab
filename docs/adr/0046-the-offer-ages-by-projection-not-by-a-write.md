# ADR-0046 — The held entry ages by projection, not by a write: `expire` never touches the offer

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `undo-a-removal` (`.sdlc2/features/undo-a-removal/design.md` §2.4, §3)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0030 (every save attempt and removal is perceivable), ADR-0036 (the moment is an
  instant handed in), ADR-0039 (falling off is a command driven by the tick), ADR-0043 (the offer ends
  rather than refuses), ADR-0044 (one writer for the list and the offer)

## Context

The seed requires the held entry to age like any other saved name: *"Once its saved-at moment is more
than a day old, the offer goes with it"* — and it requires the going to be **silent**: *"When it ends
the control is simply absent on the next render… Nothing is said, nothing is announced."*

The screen already has a rule shaped like this. `expire(visit, now)` runs on the tick, drops rows past
the day-old cutoff, and writes them out through `withSavedNames` so the list write is announced like
every other (ADR-0039). Putting the offer's ageing in the same place is the first thing anyone would
try, and it is what makes this decision worth a record: **the obvious home is the wrong one, and the
reason is the announcement machinery, not the rule.**

The relevant scenario is issue 03's fourth: Ada was saved 23 h 55 m ago and removed; Bob was saved
just after and is still on screen; six minutes pass. The offer must go. Nothing else may.

## Options considered

1. **`expire` clears `lastRemoval` through `withSavedNames`.** *Rejected — it would make the ending
   loud, and it would delete a message.* In that scenario the list is unchanged (Bob is minutes old),
   so the only write is the offer's. Routing it through `withSavedNames` bumps `savedNamesRevision`
   and passes `null` for the refusal — so a standing *"Ada is already saved."* would vanish because an
   unrelated offer aged out, and the region would be handed a fresh revision for a change the visitor
   is not supposed to notice. The seed asks for silence and this option pays for noise.

2. **`expire` clears `lastRemoval` with a plain spread, bypassing `withSavedNames`.** *Rejected*, and
   it is the tidiest of the losers: no revision, no refusal cleared, and the field ends up `null` as
   required. But it gives `lastRemoval` **a second writer**, which is exactly the property ADR-0044
   exists to prevent. The invariant "one writer, and every list write decides the offer" would survive
   as a sentence with an exception in it, which is how single-writer rules die.

3. **A second command, `expireOffer(visit, now)`, called from the same tick.** *Rejected.* Same second
   writer as option 2, plus a second command on the tick — and the seed refuses that explicitly when
   it refuses a countdown: *"A countdown would put a second thing on the clock's tick."* Two calls per
   tick also reopen the question of whether they can disagree about `now`.

4. **Give the offer its own timer or its own expiry timestamp.** *Rejected, and the seed rejects it
   first:* the offer stands rather than counting down, and it would take the control away mid-reach
   from anyone navigating with a screen reader. Listed so the rejection is on record in the file a
   future reader opens, not only in the seed.

5. **Do not store the ageing at all: keep `lastRemoval` exactly as `remove` wrote it, and derive
   *whether the offer stands* on every render from the held entry's own moment and the current
   time.** *(chosen)*

## Decision

`expire` is **unchanged** with respect to the offer: it ends the offer when it drops a row (because a
fall-off is a write to the list — ADR-0043), and it still returns the visit **by identity** when it
drops nothing. The ageing lives in two private predicates and one projection:

```ts
function hasAged(savedAt: number, now: number): boolean          // now - savedAt > DAY_MS   (INV-37)
function stands(held: LastRemoval | null, now: number): held is LastRemoval          //        (INV-38)
export function offeredName(visit: Visit, now: number): string | null
```

`hasAged` is INV-31's comparison **moved out of `expire`**, not copied: rows and the offer read one
cutoff, so they cannot come to mean different days. `stands` is read by two callers and answers both
questions with one value — whether the control exists, and whether the command acts.

The ending is then not an event at all. The tick already re-renders the screen every fifteen seconds
because `now` is screen state (P25); on the first tick past the cutoff, `offeredName` returns `null`
and the button is not rendered. No state changed, no revision moved, no refusal was cleared.

## Consequences

**Positive**

- **Silence is structural.** There is no write, so there is nothing for the announcement machinery to
  pick up. The remaining question is only whether a screen reader announces a *removed* node, and
  `aria-relevant` defaults say it does not (design.md N18) — the same reason the Save button and the
  sort control already vanish quietly.
- **One writer survives intact** (ADR-0044), and one cutoff serves both rules (INV-37).
- **A restored name keeps ageing from its original moment** with no rule of its own: the entry object
  `remove` captured is the object `bringBack` puts back, and `expire` reads its `savedAt` like any
  other row's.
- The domain stays deterministic and clock-free: `now` is an argument, exactly as `save` and `expire`
  already take one (ADR-0036). No clock port, no fake, no mock.

**Negative / accepted**

- **A stale `lastRemoval` lingers in state after its cutoff**, holding one small object alive until
  the next list write or unmount. Nothing can act on it (`stands` gates both readers), and the cost is
  one object per visit.
- **Two arguments where one used to do.** `bringBack` and `offeredName` both take `now`, so the
  component threads its reading into two more places. Accepted: it is what keeps the rule pure.
- **The offer's disappearance *is* a perceivable change to a live region's contents**, unlike the
  age readings, which are `aria-hidden`. So the merged constraint test *"leaves nothing an assistive
  technology can perceive changed by a tick"* is no longer the whole truth about ticks — it is true
  because it never leaves an offer standing. Stated in design.md N19 and VH-02 rather than left for
  someone to find by "strengthening" that test.

## Related

ADR-0030, ADR-0036, ADR-0039, ADR-0043, ADR-0044, ADR-0047,
`.sdlc2/features/undo-a-removal/design.md` §2.4 (INV-37, INV-38), §3 (the tick's data flow), N18–N20.
