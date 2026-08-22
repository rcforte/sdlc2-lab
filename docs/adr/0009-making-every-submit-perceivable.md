# ADR-0009 — Making every submit perceivable: the aggregate counts submissions, the component renders that count as node identity

- **Status:** Accepted — the decision is in the code (`Visit.greetingCount`, `src/GreetingScreen.tsx`
  `<span key={visit.greetingCount}>`) — and **amended twice by `greeting-log`
  (2026-08-22)**, in scope and in mechanism, and withdrawn in neither:
  **[ADR-0014](0014-clearing-is-perceivable-by-focus.md)** scopes R9 to **submissions** (clearing
  the greeting log deliberately returns the status region to textless — the state R9's wording
  forbade when a submission was the only command — and its perceivability is carried by a focus
  move instead); **[ADR-0011](0011-greeting-derived-from-the-newest-log-entry.md)** replaces this
  ADR's storage mechanism, `Visit.greetingCount` and `<span key={visit.greetingCount}>`, with
  `visit.greetingLog.length` and `<span key={visit.greetingLog.length}>` — same identity, same
  behaviour on an identical resubmit (measured: `greeting-log` design §5.5), one fewer field.
  Still contingent on `greet-visitor`'s **VH-09** (the requirement) and **VH-10** (the human check
  that backs it); this ADR remains the architect's decision record for **VH-11**.
- **Date:** 2026-08-16
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` R9, §2.3, §2.4 INV-8a /
  INV-8b / P4 / P5, §3, §5.4, §6)
- **Deciders:** architect node in DECIDE MODE (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0001 (the aggregate this extends), ADR-0002 (derived greeting — unchanged),
  ADR-0003 (what may live in the pure module), ADR-0004 (state lives in the component), ADR-0007
  (invariants arrive whole per slice)

## Context

The seed says the greeting "is announced to the visitor". The `ux` node then found the case that
sentence does not survive on its own and recorded it as **VH-09**: a visitor who submits to an
outcome **byte-identical** to the one already on screen — the same valid name twice (`mockup.html`
state matrix row 4a), or the same failing blank twice (row 12a). An ARIA live region is announced
when its content **mutates**, not when a button is clicked. If the second submission renders the
same string, React writes nothing to the DOM, no mutation record is produced, and the visitor hears
nothing: they have no way to tell their click registered.

VH-09 states the requirement as an **outcome**, deliberately leaving the DOM mechanism open:

> every submit must be perceivable to a screen-reader visitor, without the status region/alert ever
> being removed, recreated, or left textless once it holds content

with a scoping rule that matters as much as the requirement: on a **successful** resubmission only
the status region is renewed; on a **failing** resubmission only the alert is. Force-mutating the
status region on a failing submit would re-announce a stale `Hello, <name>` as feedback for a
submission that did **not** succeed, contradicting Story2-S4 and mockup row 9.

Two facts made this ADR necessary rather than optional.

**One: the design as previously written provably fails it.** Both shapes were built from the design
and instrumented with a `MutationObserver` (React 19, jsdom 26, `user-event` 14.6.4, `jest-dom`
6.9.1):

| Shape | Identical successful resubmit | Identical failing resubmit |
| --- | --- | --- |
| `Visit = { greetedName, lastSubmissionWasBlank }`, plain text render | **0 mutations** (status region) | **0 mutations** (alert) |
| This ADR's decision | **2 mutations** (status region), **0** on the alert | **2 mutations** (alert), **0** on the status region |

**Two: the domain cannot express the difference.** With `greetedName` and `lastSubmissionWasBlank`
only, `submit(submit(v,'Ada'),'Ada')` equals `submit(v,'Ada')`. The aggregate literally cannot
distinguish *"the visitor submitted twice"* from *"the visitor submitted once"* — so no purely
domain-driven rendering can either. That is an under-modelled domain, not merely a missing UI trick:
the seed's capability is the app *responding to you*, and a response the visitor cannot perceive did
not happen.

An earlier round of the design read this backwards, calling the pure function's value-idempotence a
virtue ("no idempotency concern to design for"). Value-idempotence is precisely the hazard here.

## Options considered

1. **Leave R9 unconstrained; name the developer / frontend-design node as owner and move on.**
   *Rejected.* This is the honest-sounding option and it is the one that ships the measured silence
   above: VH-09 left the *mechanism* open, not the *outcome*, and "open to the next node" with no
   invariant, no owner and no seam is how a requirement disappears. It is also the trade §5.1 of the
   design explicitly refuses elsewhere (it declines to ship a lingering alert for one slice to buy a
   red bar) — refusing it there and taking it here would be incoherent. The architect node is the
   node that hands down to `developer`; if the mechanism is anyone's to pick before code exists, it
   is this one's.

2. **Two monotonic counters on `Visit` — `greetingCount` incremented by `submit`'s non-blank
   branch, `blankCount` by its blank branch — rendered by `GreetingScreen` as the React `key` of a
   single child node inside each region.** *(chosen)*

3. **Component-local nonces**: two `useState<number>` counters in `GreetingScreen`, bumped in the
   submit handler according to which outcome occurred, used as the same keys.
   *Rejected, and it was the closest call.* It keeps the domain at two fields and is unarguably a
   presentation mechanism for a presentation problem. But it puts a *rule* back in the component —
   "which nonce advances for which outcome" is the same branch `submit` already owns, duplicated in
   the transport layer, where INV-5b deliberately keeps the component from inspecting outcomes at
   all (it renders `alertText(visit)`, it never reads `lastSubmissionWasBlank`). It is also
   untestable: no unit can reach it, and the DOM cannot observe it (§5.4), so the rule would rest on
   review alone. Option 2 makes the same rule a pure-function property with two assertions.

4. **A visually-hidden counter rendered as text** inside each region (`<span class="sr-only">2</span>`,
   or a trailing zero-width nonce).
   *Rejected on contract grounds, not taste.* The status region must contain **no text at all**
   before the first greeting — VH-04 pinned that shape and Story 1 asserts it as
   `expect(screen.getByRole('status')).toHaveTextContent('')`. A nonce in the region's text breaks
   that assertion at rest, and any visible-to-`textContent` nonce risks Story 1's exact-text steps.
   It also needs a `sr-only` styling convention this repo does not have (seed: styling out of scope).

5. **Remove and re-insert the region (or the alert element) on each submit.**
   *Rejected.* Directly forbidden by VH-04 for the status region ("deliberately not allowed to be
   absent-then-created") and by VH-09 for both. It is also the classic unreliable pattern: a live
   region inserted at the moment its text arrives may not be observed in time to be announced.

6. **A single `submissionCount` incremented by every submit**, used as the key for both regions.
   *Rejected — it violates the scoping rule.* A failing submit would change the status region's key,
   re-announcing a stale greeting as feedback for a submission that failed (Story2-S4, mockup row 9).
   Two counters is the minimum state that can renew one region without touching the other.

7. **An imperative `useEffect` that rewrites the text node on each submission.**
   *Rejected.* Introduces the first effect and the first direct DOM write in the feature, for a
   result React's own reconciliation gives us with a `key`. Design §3's "no async work, no effect, no
   cleanup" is worth keeping.

## Decision

**Adopt VH-09 as design rule R9, and give it an owner in the domain.**

`Visit` gains two monotonic counters, written by `submit` and by nothing else:

```ts
export type Visit = {
  readonly greetedName: string | null
  readonly greetingCount: number          // INV-8a — greetings produced this visit
  readonly lastSubmissionWasBlank: boolean
  readonly blankCount: number             // INV-8b — blank submissions rejected this visit
}

export const newVisit: Visit = {
  greetedName: null, greetingCount: 0, lastSubmissionWasBlank: false, blankCount: 0,
}

export function submit(visit: Visit, rawName: string): Visit {
  if (isBlank(rawName)) {
    return { ...visit, lastSubmissionWasBlank: true, blankCount: visit.blankCount + 1 }
  }
  return {
    greetedName: rawName.trim(),
    greetingCount: visit.greetingCount + 1,
    lastSubmissionWasBlank: false,
    blankCount: visit.blankCount,
  }
}
```

Each branch advances exactly one counter and carries the other through unchanged — **that asymmetry
is the scoping rule**, expressed once, in the one place that knows which outcome occurred.

`GreetingScreen` renders each counter as the `key` of a single child node, and nothing else:

```tsx
<p role="status" aria-live="polite">
  <span key={visit.greetingCount}>{greetingText(visit)}</span>
</p>
{alert !== null && (
  <p role="alert" id={ALERT_ID}>
    <span key={visit.blankCount}>{alert}</span>
  </p>
)}
```

The region elements themselves are untouched by this: `role="status"` is still rendered
unconditionally from the first mount (P1/VH-04), the alert is still present iff there is an error
(P2), the alert's `id` is stable so `aria-describedby` never dangles (P3), and both regions were
confirmed to be the **same element object** before and after a repeat submission. Only the child
node is replaced.

**Boundaries this decision respects.** No role, id, class name or `aria-*` name enters `src/visit.ts`
(ADR-0003) — the counters are numbers with domain meaning, not ARIA. The component gains no rule: it
reads two numbers and never branches on them (a value it merely hands to React as identity). No
projection wraps them, because `return visit.greetingCount` is an abstraction with a cost and no
work.

**Sequencing (ADR-0007).** R9 is carried by two invariants, not one, so that each arrives whole with
the concept it belongs to: **INV-8a + P4 land in slice 01** with the success path (the only branch
that exists there), **INV-8b + P5 land in slice 02** with the blank-name concept. Nothing is
half-written at any slice boundary.

**Testing (design §5.4).** The domain half is asserted in `src/visit.test.ts` — the inner-cycle file
ADR-0008 already established — with two assertions that fail if either counter stops advancing or
starts advancing on the wrong branch. The *announcement* half is **not** asserted: jsdom implements
no live-region announcement, and rows 4a/12a are byte-identical to rows 4/12 in every property a
query can read, so a jsdom test would pass whether or not the mechanism exists. It is a named human
check at VERIFY (VH-10), listed as a residual risk in design §6 beside VH-07's. The developer node
must not manufacture a jsdom "coverage" test for it.

## Consequences

**Positive**

- The requirement has an owner, a seam and a slice — it can no longer be lost between nodes.
- The aggregate can now state a fact it could not state before ("this is the second greeting"),
  which is the honest reading of the defect: it was a modelling gap, not a rendering trick.
- The scoping rule (renew one region, never the other) is enforced by construction rather than by
  care: it is impossible to renew the status region from the blank branch without editing `submit`.
- Half of an untestable requirement became mechanically testable — two pure assertions, no new
  dependency, no new test kind, no change to any of the sixteen scenarios.
- The component stays rule-free, so ADR-0003's division of labour survives intact.

**Negative / accepted**

- **`Visit` carries two fields whose only consumer is a render key.** That is real domain-model
  pressure from a presentation need, and it is the strongest argument for option 3. Accepted because
  the alternative puts a branch rule in the transport layer where nothing can test it.
- **The mechanism's effect is unverifiable under the declared seam.** `key`-driven node replacement
  is the standard way to re-trigger a live region and the mutations were measured, but "a mutation
  occurred" is not "a screen reader spoke". VH-10's human check is what closes that, and until it is
  performed, R9 is *designed for* and not *proven*.
- **A slightly deeper DOM** (one `<span>` inside each region). Checked: `getByRole`,
  `toHaveTextContent('')` and `toHaveTextContent('Hello, Ada')` all behave identically, and
  `aria-describedby` still resolves.
- **It takes a decision VH-09 left open.** VH-09 left the mechanism to "the developer/frontend-design
  node"; this ADR picks one before code exists. Reversible in one commit: if a human or the developer
  prefers option 3, delete the two fields and their assertions and move the two counters into
  `useState` — P4/P5 are rewritten against component state and no scenario changes. If a human
  withdraws VH-09 entirely, delete the fields, the keys and the assertions; nothing else moves
  (design §7).

## Related

VH-09 (the requirement — honoured, not relitigated), VH-10 (the human check), VH-11 (this decision's
`VERIFY-WITH-HUMAN` record), `mockup.html` rows 4a/12a and §5, ADR-0001, ADR-0003, ADR-0004,
ADR-0007, ADR-0008, design §2.4 (INV-8a/INV-8b/P4/P5), §3, §5.4, §6, §7.
