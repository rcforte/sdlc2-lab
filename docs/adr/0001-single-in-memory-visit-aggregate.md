# ADR-0001 — One in-memory `Visit` aggregate with a single `submit` command

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-15
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` §2)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)

## Context

The feature has four rules that must agree with one another at every moment: a name is blank iff it
trims to empty; a greeting exists only for a non-blank name; a blank submission must **not** disturb
a greeting already on screen; and the alert must be present exactly when the most recent submission
was blank. Those four rules touch the same two pieces of state, so if they are enforced in different
places they will eventually disagree — the classic symptom being an alert that lingers next to a
fresh greeting, or a greeting wiped by a stray blank submit.

The product contract (`feature.md`, Stories 1–4) also pins a case that rules out treating "the
greeting" and "the error" as independent: *A blank submission does not clear an existing greeting*
requires a greeting and an alert to be true **at the same time**, decided by **one** event (the
submission).

## Options considered

1. **No aggregate: two independent pieces of component state** (`greeting`, `error`), each updated
   by the click handler.
   *Rejected.* The handler becomes the (only, implicit) owner of all four rules, and every future
   entry point that submits — Enter-to-submit (VH-01), a future "greet again" control — must
   re-derive them correctly. It is the anemic-model shape: state with no rules attached, rules with
   no home. The Story 2 case above makes the coupling explicit, so pretending the two values are
   independent is a modelling lie.

2. **Two aggregates: `Name` and `Greeting`** (or `Greeting` and `ErrorNotice`), coordinated by the
   component.
   *Rejected.* It manufactures the exact anti-pattern the rubric warns about: one submission would
   have to update both consistently, i.e. a transaction spanning two aggregates, with the component
   playing coordinator. Neither candidate has identity, a lifecycle, or an independent reason to
   change — the sole justification would be symmetry with a bigger system that does not exist here.

3. **A finite state machine, hand-rolled or via XState** (`idle → greeted → blank → …`).
   *Rejected.* The state space is genuinely two orthogonal facts (is there a greeting; was the last
   submission blank), i.e. four combinations, all reachable and all legal. Encoding that as named
   states buys no illegal-state elimination, and XState is a runtime dependency the lab repo does
   not need (`CLAUDE.md`: nothing beyond React + Vitest is justified here).

4. **One aggregate, `Visit`, with one command `submit(rawName)` and two pure
   projections.** *(chosen)*

## Decision

Model the visit as a **single aggregate**, `Visit`, living in `src/visit.ts`:

```ts
type Visit = {
  readonly greetedName: string | null        // trimmed, never blank
  readonly lastSubmissionWasBlank: boolean
  // amended by ADR-0009: + greetingCount: number, + blankCount: number
}
const newVisit: Visit
function submit(visit: Visit, rawName: string): Visit
function greetingText(visit: Visit): string          // '' when none
function alertText(visit: Visit): string | null      // null when none
```

`submit` is the **only** state transition in the feature. Every return path assigns both fields (by
spread), so the pair is always mutually consistent. Invariants INV-1…INV-5b (design §2.4) each name
this module — and exactly one function within it — as their single owner.

> **Amended by [ADR-0009](0009-making-every-submit-perceivable.md).** The aggregate gains two
> monotonic counters (`greetingCount`, `blankCount`) so that a repeat submission with an identical
> outcome is still a distinguishable state — without them the aggregate cannot tell "submitted
> twice" from "submitted once", and the live region stays silent (VH-09). The shape of this
> decision is unchanged: still one aggregate, one command, one consistency boundary, and `submit`
> still assigns every field on every return path. Invariants INV-8a/INV-8b (design §2.4) name
> `submit` as their single owner, exactly as INV-1…INV-5b do.

No domain events are published (see ADR-0006). No entity, repository, or factory is introduced: the
visit has no identity and is created only by `newVisit`.

**On the name.** The aggregate is `Visit`, not `GreetingSession`. An earlier draft used the latter
and it was wrong twice over: the seed's Out of scope says "Accounts, **sessions**, authentication of
any kind", so "session" is the one word this feature must not overload; and the product contract
already has an agreed term for exactly this concept's lifetime — **Fresh visit** ("arriving at the
greeting screen anew … with nothing from a previous visit lingering"). `Visit` / `newVisit` / "a
fresh visit" is therefore the contract's own vocabulary, used verbatim (design §2.2). The module is
`src/visit.ts` to match.

## Consequences

**Positive**

- Exactly one consistency boundary exists, so **no operation can span two aggregates**: the
  cross-aggregate transaction is impossible by construction rather than by convention.
- Every state change is one pure function applied to the whole aggregate and committed in one
  React state update — atomic, replayable, and trivially unit-testable without a DOM.
- Adding a second entry point (Enter-to-submit, a future control) costs one call to `submit`; it
  cannot re-derive the rules differently.

**Negative / accepted**

- A two-field record plus four functions is more structure than a 20-line component strictly needs
  today; the payment is one extra file (ADR-0003 argues why that file earns its place).
- The aggregate is in-memory only, so "consistency boundary" here means *within one mount* — there
  is no transaction manager and none is wanted (ADR-0006).
- `Visit` will need a third field the day a rule appears that neither existing field
  answers (e.g. "greet only once per visit"). Because `newVisit` is the sole construction site and
  `submit` uses spreads, that change stays local.

## Verification

Not asserted by mocking or by inspecting the type: every invariant above surfaces through the DOM in
the acceptance scenarios — notably *"A blank submission does not clear an existing greeting"*
(INV-4) and *"Correcting a blank submission clears the alert and shows the greeting"* (INV-5a's
non-blank branch — the scenario that would go red if slice 02 wrote only the blank branch, which is
why slice 03 is a guard slice rather than a red-first one: ADR-0007, design §5.1).

## Related

ADR-0002 (what the aggregate stores), ADR-0003 (why it is a separate module), ADR-0004 (where the
instance lives), ADR-0006 (no ports, no events), ADR-0007 (INV-5a arrives whole at slice 02, so the
"lingering alert beside a fresh greeting" symptom named in this ADR's Context is never shipped).
