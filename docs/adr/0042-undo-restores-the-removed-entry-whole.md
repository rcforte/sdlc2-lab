# ADR-0042 — Bringing a name back restores the entry whole: same moment, same place

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `undo-a-removal` (`.sdlc2/features/undo-a-removal/feature.md`, Agreed scope)
- **Deciders:** the pre-run grilling (human), recorded on the main thread
- **Relates to:** ADR-0026 (the list lives in the visit), ADR-0027 (one private writer of the list
  fields), ADR-0035 (a saved name is a record with name-only identity), ADR-0036 (the moment is an
  instant handed in), ADR-0038 (one ordering rule for the marker and the sort view)

## Context

The visitor removes a saved name by accident and wants it back. The obvious cheap implementation
is to remember the *name* that left and, on undo, put it through `save` again with a fresh moment.
Every other way of getting a name into the list is a save, so a fifth one looks natural.

It is wrong here, and the reason is that a saved name has carried a moment since ADR-0035, and
three visible things read that moment: the age reading on the row, the Newest marker, and the
newest-first view.

## Decision

What the visit holds is the **entry**, not the name: the saved name with the moment it already
had, and the position it held in the list. Bringing it back puts all three back.

## Options considered

1. **Re-save the name with a fresh moment.** *Rejected.* A name saved at 14:02 and removed at
   14:40 would come back reading "saved just now", would steal the Newest marker from a name that
   genuinely is newer, and would move to the top of the newest-first view. The visitor asked to
   take back a removal; they would get a save they did not make. It is also redundant — greeting
   again and pressing Save is already exactly that, and is already available.

2. **Restore the moment but append to the end of the list.** *Rejected*, and it is the near miss.
   The default view is save order, so a name carrying an old moment sitting last would make the
   two views contradict each other about which row is older — the disagreement ADR-0038 exists to
   prevent, arriving through the back door.

3. **Restore the entry whole.** *Chosen.* "The list is as it was" is one sentence, and it is
   checkable: the list before the removal and the list after the undo are the same value.

## Consequences

- The restored entry can be older than a day, because its moment did not stop while it waited.
  That is settled by ADR-0043's companion rule: the held entry ages, and the offer goes when it
  passes the cutoff, so a name is never brought back only to fall off seconds later.
- The held entry carries a position, which is the one piece of it that is *not* a value of the
  domain's own making — it is an index into a list that nothing else may reorder while the offer
  stands. ADR-0043 is what keeps that true: any other write to the list ends the offer, so the
  index can never be stale when it is used.
- The five-name limit needs no check on this path. The removal freed exactly one slot and no save
  can have happened since (ADR-0043 again), so bringing the name back cannot overfill the list.
  That is structural, not a rule anyone has to remember.
