# ADR-0027 — `save` has three outcomes; a refusal is data, and one private transition writes list, refusal and revision together

- **Status:** Proposed — accepted pending the human VERIFY gate; the precedence question is
  additionally contingent on `VERIFY-WITH-HUMAN.md` **VH-03**
- **Date:** 2026-08-23
- **Feature:** `remembered-names` (`.sdlc2/features/remembered-names/design.md` §2.4 INV-17/INV-20/INV-21, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0007 (invariants arrive whole), ADR-0020 (`save` takes no name), ADR-0026,
  ADR-0030, ADR-0033 (why slices 04 and 05 are guards)

## Context

Saving used to have one outcome. It now has three — appended, *already saved*, *full* — and two of
them must **say something**, because a button that appears to do nothing is the silence this
codebase has designed against three times (seed, *Decisions*).

That creates a second fact the visit has to hold: *what the last save attempt did*. And it creates
a hazard the single slot never had — a message that outlives the state it describes. "Five names is
the limit. Remove one to save another." is true until the visitor removes one; left standing after
the removal it is a lie, and it is announced again the moment removal moves focus into the region
(ADR-0031). "Ada is already saved." is a lie the moment Ada is removed.

A third fact rides along: the region must re-announce even when nothing visible changed (the same
refusal twice), which needs a monotonic counter — the ADR-0009 mechanism, previously `saveCount`.

So three fields — the list, the refusal, the counter — must never disagree.

## Options considered

1. **Throw on refusal** (`save` raises `AlreadySavedError`).
   *Rejected.* The domain is pure, total and synchronous by construction (ADR-0003); exceptions
   would make the component a `try`/`catch` coordinator and would put the decision "what does the
   visitor see" in the transport layer.
2. **Return a `Result<Visit, Refusal>`** and let the component keep the refusal in a second
   `useState`.
   *Rejected.* It moves the refusal outside the aggregate, which is exactly where it can go stale:
   nothing would then couple "the list changed" to "the message must go", and the coupling would
   have to be remembered in two handlers. It also splits one visitor-visible state across two hooks
   for no gain (ADR-0004, ADR-0026 option 2).
3. **Store the refusal as a message string** (`lastSaveMessage: string | null`).
   *Rejected.* It parks product copy in state, so any string becomes representable, the domain gains
   a second place the sentences live (design §2.5 keeps that at one), and a test asserting the
   *state* would pass whatever the string happened to say.
4. **Store a boolean pair** (`wasRefused`, `wasFull`).
   *Rejected.* Two booleans make four states, two of which are nonsense, and neither carries the
   name the already-saved sentence needs.
5. **Derive the refusal instead of storing it** — e.g. show "already saved" whenever the greeted
   name is in the list.
   *Rejected, and it is subtly wrong rather than merely inelegant.* It would show the refusal
   *before the visitor ever pressed Save* (greet as Ada while Ada is saved, and the region scolds
   you unprompted), and it could not distinguish "refused just now" from "has been true all along".
   The refusal is the outcome of an **act**, not a property of the state.
6. **Store `lastSaveRefusal: SaveRefusal | null` — a discriminated union — and write it, the list
   and the revision through one module-private transition `withSavedNames`.** *(chosen)*

## Decision

```ts
export type SaveRefusal =
  | { readonly kind: 'already-saved'; readonly name: string }
  | { readonly kind: 'full' }

function withSavedNames(visit, savedNames, refusal): Visit   // NOT exported
```

`withSavedNames` is the **only** writer of `savedNames`, `lastSaveRefusal` and
`savedNamesRevision`. It takes the new list and the new refusal in the same call and increments the
revision. `save` and `remove` decide *what* the outcome is and call it; nothing else can write the
three fields, and `submit` carries them through untouched (INV-23, compiler-enforced).

Therefore:

- **INV-20 has exactly one owner.** A list write without a refusal decision is unrepresentable, so
  "clear the message too" is not something two commands must each remember. A successful save and
  every removal pass `null`; the two refusing branches pass a value.
- **INV-21 has exactly one owner.** Every write is an event, including a refusal that changed
  nothing. Commands that could not do anything (`save` with no greeting, `remove` of a name that is
  not saved) return the input value by identity and never reach this function, so a press with no
  possible effect is not counted.
- The copy stays out of the state: `refusalText(visit)` turns the union into the agreed sentence,
  in a `switch` with no default branch, so a third refusal kind added later is a `tsc` error rather
  than a silent `null`.
- **Both refusals arrive with `save` itself**, in the slice that introduces saving — ADR-0007's
  rule, and the reason issues 04 and 05 are guard slices (design §5.1). Shipping an append that
  ignores duplicates or the limit would put a live concept with a wrong branch in front of a
  visitor for the length of a slice.
- **Precedence:** when the list is full *and* the greeted name is already in it, the already-saved
  refusal wins. It is the true reason nothing was added, and the full-list sentence would send the
  visitor to make room for a name that is already there. No acceptance criterion decides this;
  recorded as **VH-03**.

## Consequences

**Positive**

- A stale refusal is not a bug to be avoided; it is a state the type system cannot express.
- The two sentences exist in exactly one place each, so a copy change is one edit (design §2.5).
- The already-saved refusal carries its own name, so it stays correct even if the visitor is
  greeted as somebody else before the region is read.
- The revision counter is set once, in one place, and can never be forgotten by a new command that
  writes the list — because a new command cannot write the list except through this function.

**Negative / accepted**

- **A private function is invisible to the unit tests** (`visit.test.ts` can only reach it through
  `save`/`remove`). Accepted: it is an implementation of a coupling, not a rule of its own, and both
  callers are exercised through the DOM.
- **`lastSaveRefusal` survives a greeting.** After a refusal, greeting somebody else leaves the
  sentence standing. Accepted, and true rather than stale — both sentences remain accurate for as
  long as the list is unchanged, and scoping the refusal to submissions as well would make `submit`
  a writer of the list fields, which INV-23 forbids for a much better reason.
- **One more union type in a codebase that has none.** Justified by option 3's alternative: copy in
  state.

## Related

ADR-0007, ADR-0009, ADR-0020, ADR-0026, ADR-0030, ADR-0033, design §2.4, §4.1, §5.1,
`VERIFY-WITH-HUMAN.md` VH-03.
