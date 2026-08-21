# ADR-0006 — No driven ports and no domain events in this feature

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-15
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` §3, §6)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)

## Context

A hexagonal reading of this feature invites three abstractions: a **repository/store port** for the
the visit, a **domain event** (`VisitorGreeted`, `BlankNameRejected`) for the announcement or for
future analytics, and an **i18n port** for the two literal strings (whose wording is itself
unconfirmed — VH-03). Each is a seam where change is plausible. The design has to say whether they
are worth their cost *now*, because an unused port is not free: it must be maintained, it invites
implementations, and — in this feature specifically — a store port would create exactly the state
leak Story 4 exists to prevent.

The seed is unusually explicit about the boundary: no backend, no `localStorage`, no analytics, no
internationalisation, nothing remembered.

## Options considered

1. **Introduce a `GreetingStore` port now** with an in-memory adapter, "so persistence is easy
   later".
   *Rejected.* The port would have exactly one implementation, chosen for its inability to persist.
   Worse, a port implies an owner outside the component, which is the module-singleton leak
   ADR-0004 rejects and Story 4 fails on. Persistence is explicitly a *separate future capability*
   per the seed; when it arrives it will bring its own requirements (which visit? whose name? for
   how long?) that today's guesses would get wrong.

2. **Publish domain events from `submit`** (returning `[visit, events]`, or via a tiny emitter),
   with no subscribers today.
   *Rejected.* Nothing subscribes. The "announcement" the seed cares about is an ARIA live region —
   a rendering property (P1), not a message. Events would double the command's return type and every
   test's arrangement for zero present-day behaviour.

3. **Extract the two strings behind an i18n port / message catalogue.**
   *Rejected.* Internationalisation is out of scope by the seed, and the alert text is already a
   single exported constant (`ALERT_MESSAGE`) — a rename is one edit. A catalogue would add
   indirection to the very strings a human is being asked to confirm literally (VH-03).

4. **No driven ports, no events; keep the domain a pure function set and record where each would
   attach if the need arrives.** *(chosen)*

## Decision

This feature has **no driven side**. The only boundary is the driving one: `GreetingScreen`
(transport) calls `visit.ts` (rules). The domain module imports nothing and emits nothing.

Where each rejected abstraction would attach, when it earns its keep:

- **Persistence** → a driven port called from the component (or from a thin application function
  above it), never from inside `submit`; `submit` stays pure so it remains the single owner of the
  invariants. The trigger is a requirement for anything to outlive a visit.
- **Events** → `submit` returns `[Visit, DomainEvent[]]`, with the component draining the
  list. The trigger is a second interested party (analytics, an audit trail, a second view).
- **i18n** → `greetingText` and `alertText` take a message resolver. The trigger is a second locale.

Until then, the honest architecture is: two files, one direction of dependency.

## Consequences

**Positive**

- Nothing to maintain, mock, or wire; every abstraction in the codebase is inhabited.
- The absence of a store port removes the *natural place* for anything to outlive the mount: there is
  no owner outside the component, so INV-6a follows from the shape of the code. Note the limit,
  corrected here: this does **not** make INV-6b's "reaches nothing that could persist" half
  structural. `tsconfig.json` puts `DOM` in `lib`, so a bare `localStorage.setItem(...)` needs no
  port and no import — it is caught by ADR-0008's purity assertion and review checklist, not by the
  absence of a port.
- The three future seams are named with their trigger conditions, so the next author does not have
  to rediscover them — and does not add them prematurely either.

**Negative / accepted**

- The first requirement to persist or to observe a greeting will touch `submit`'s signature or the
  component's body. That is a small, mechanical change in a 40-line surface — deliberately preferred
  over carrying three unused abstractions until then.
- With no port for storage, the "not one byte is ever written" rule is not covered by any acceptance
  scenario (VH-06). It is covered *for `src/visit.ts`* by ADR-0008's purity assertion, and for
  `GreetingScreen.tsx` by review against ADR-0008's two-line checklist. The earlier wording here —
  "the pure-module rule keeps any such write confined to the component" — overstated it: the
  pure-module rule is what the assertion enforces, not something the type system enforces on its own.

## Related

ADR-0001 (one aggregate, no events), ADR-0003 (the pure module rule), ADR-0004 (state lifetime),
ADR-0008 (how the no-storage rule is actually guarded), VH-03 (unconfirmed copy), VH-06 (storage
assertion dropped), the seed's Out of scope.
