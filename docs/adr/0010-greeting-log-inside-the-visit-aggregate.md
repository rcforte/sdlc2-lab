# ADR-0010 — The greeting log is a field of the existing `Visit` aggregate

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` §2.1, §2.3, §2.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0001 (the aggregate this extends), ADR-0004 (where the instance lives),
  ADR-0006 (no driven ports), ADR-0011 (what the aggregate stops storing)

## Context

The feature adds a second visible fact to the greeting screen — an ordered record of every greeting
this visit — and a command that destroys it. Three of the contract's rules bind that record to the
greeting already modelled in `Visit`:

- *"The current greeting is an entry"* and *"the greeting log's newest entry reads 'Alan'"* asserted
  from the same Given/When (Story 1, third scenario): the greeting and the log's tail must agree at
  every observable moment.
- *"Clearing empties the log **and removes the current greeting with it**"* (Story 2, third
  scenario): one visitor action, two facts changed, no intermediate state a visitor can observe.
- *"A blank submission does not add to the greeting log"* while the alert appears (Story 1): one
  submission decides three things at once — the log, the greeting, and the alert.

So the question is not "where do we put an array" but "which consistency boundary owns these rules".
`greet-visitor` already answered the same question for the greeting and the alert (ADR-0001); this
is the same question asked again with a third fact in play.

## Options considered

1. **A separate `GreetingLog` aggregate** (its own type, its own commands), with `Visit` keeping the
   greeting.
   *Rejected.* `clear` would then have to empty the log **and** null the greeting — one visitor
   action mutating two aggregates in one indivisible step. That is a cross-aggregate transaction,
   the shape aggregates exist to forbid, and here it buys nothing: there is no independent lifecycle,
   no separate persistence, no contention, no separate author. It also splits the "the greeting is
   the newest entry" rule across two owners, so nothing in the design could enforce it — only the
   acceptance tests could notice it had broken.
2. **A second `useState<string[]>` in `GreetingScreen`, beside `useState<Visit>`.**
   *Rejected.* It puts the append rule, the clear rule and the "greeting equals newest entry" rule
   inside a component — the anemic shape ADR-0001 and ADR-0003 already rejected — and it creates a
   **second lifetime** to guarantee. Story 3 (fresh visit) would then have two independent ways to
   fail, and a future refactor could hoist one hook without the other. Keeping the log inside `Visit`
   means INV-6a already owns its lifetime, so slice 03 needs no new invariant at all.
3. **A `GreetingLogStore` port with an in-memory adapter**, "so a future persisted log is easy".
   *Rejected* for the reasons ADR-0006 already gave and this feature strengthens: the seed's Out of
   scope forbids persistence, Story 3 exists to prove nothing survives a visit, and an owner outside
   the component is precisely the leak that would fail it.
4. **The log inside `Visit`** — one aggregate, two commands.

## Decision

Option 4. `Visit` gains `greetingLog: readonly string[]` (oldest first) and a second command,
`clear(visit): Visit`. `Visit` remains the only aggregate in the only bounded context, and remains
the only thing `GreetingScreen` holds in state.

## Consequences

**Good.**
- Every rule that binds the log to the greeting is enforced inside one aggregate, by one module:
  append (INV-9a), empty (INV-9b), derive (INV-10), don't-touch-on-blank (INV-13).
- `clear` is a single transition on a single value — no transaction spans anything.
- The log inherits the visit's lifetime for free (INV-6a), so Story 3 is a guard slice with no
  production code, exactly like `greet-visitor`'s Story 4.
- The aggregate got *smaller*, not bigger (ADR-0011): three fields instead of four.

**Bad / accepted.**
- `Visit` now carries an unbounded collection. The seed forbids a cap, so growth is by design; at
  this size (one visit, one screen, no persistence) it is not a resource concern worth code.
- Any future need to persist or share the log will touch one type — which is the point, but it does
  mean the type is a busier place to change than four small ones would be.

## What would change this

A requirement that the log outlive the visit, or belong to something other than one visit (a user, a
session, a device). At that moment the log acquires its own lifecycle and its own identity, and
ADR-0006's driven port and a real second aggregate both start earning their keep.
