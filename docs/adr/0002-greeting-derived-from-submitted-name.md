# ADR-0002 — Store the submitted name; derive the greeting text

- **Status:** Accepted — the decision is in the code (`src/visit.ts`, `src/GreetingScreen.tsx`) —
  and **superseded in part by
  [ADR-0011](0011-greeting-derived-from-the-newest-log-entry.md)** (`greeting-log`, 2026-08-22).
  What is superseded is the *stored field*: `Visit.greetedName` is deleted, and `greetingText` now
  derives the greeting from the greeting log's newest entry. What **stands**, unchanged and in fact
  applied one level further, is this ADR's rule — the greeting is derived, never stored, so there is
  no second source of truth to drift — along with its `string`-not-branded-type modelling choice and
  its trimming rule. Originally: *Proposed — accepted pending the human VERIFY gate (the chosen copy
  also depended on `greet-visitor` VH-03, since resolved by the human in that feature's VH-15 —
  "Greet me" confirmed, the alert shortened).*
- **Date:** 2026-08-15
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` §2.3, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)

## Context

The seed states the rule directly: *"The greeting is derived, not stored. It is a function of the
submitted name, so there is no second source of truth to drift."* An implementation can honour that
sentence or quietly violate it, and the acceptance scenarios cannot tell the difference — both
shapes make `Hello, Ada` appear. So the choice has to be made here, in the design, and recorded.

A second, related question: the seed's *Name* is a domain concept with a rule attached (blank iff it
trims to empty). TypeScript offers several strengths of modelling for that, from a plain `string` to
a branded type to a wrapper class.

Constraints in play: the field's own value must keep the visitor's untrimmed text (Story 1: *"the
Name field still contains ` Ada ` unchanged"*), trimming means `String.prototype.trim()` (VH-08),
and the greeting must change only on submission — never while typing.

## Options considered

1. **Store the rendered greeting string** (`greeting: 'Hello, Ada' | null`).
   *Rejected.* It is precisely the "second source of truth" the seed rules out: the formatting rule
   would then live at the write site, so any future writer (a second entry point, a reset, a test
   fixture) could store text that the formatter would never have produced. It also makes the stored
   value un-reusable — the day the greeting is reworded or localised, stored data is stale.

2. **Derive everything from the live input value** — no submitted-name state at all; render
   `Hello, ${rawName.trim()}` whenever `rawName` is non-blank.
   *Rejected.* It greets on every keystroke. It breaks Story 1's *"the Name field still contains
   `Ada`"* only incidentally, but it flatly breaks Story 2's *"a blank submission does not clear an
   existing greeting"* (clearing the field would erase the greeting) and Story 3's alert timing. The
   submission is a real event; the model must remember that it happened.

3. **Store both the submitted name and the rendered greeting** (a cache).
   *Rejected.* Two representations of one fact, kept in step by hand, to save a string concatenation
   per render. No measurable cost is being avoided.

4. **Store the trimmed submitted name; derive the greeting text on read.** *(chosen)*

For the *Name* value object specifically:

- 4a. **A branded type** (`type VisitorName = string & { readonly brand: unique symbol }`) with a
  smart constructor. *Rejected:* it buys compile-time protection against passing an untrimmed string
  where a trimmed one is expected — but there is exactly **one** construction site (`submit`) and one
  consumer (`greetingText`) in the same 30-line module, so the brand guards a distance of ten lines
  at the cost of casts at every boundary and a concept every future reader must decode.
- 4b. **A wrapper class/object** (`{ value: string }`). *Rejected:* same reasoning, plus it leaks
  into every test fixture and JSON-free code becomes JSON-noisy.
- 4c. **A plain `string`, with the invariant enforced at its single construction site, and the
  invariant written down (INV-2).** *(chosen)*

## Decision

`Visit.greetedName` holds the **trimmed submitted name** (`string | null`), and the
greeting text is derived by a projection:

```ts
function greetingText(visit: Visit): string {
  return visit.greetedName === null ? '' : `Hello, ${visit.greetedName}`
}
```

`greetingText` is the only place the literal `'Hello, '` appears in production code. The component
renders its return value verbatim; the raw, untrimmed text stays in the field's own `rawName` state
and is never written back from the domain (INV-7).

`greetingText` returns `''` — not `null`, not a placeholder — because the status region is always
rendered and the pinned assertion is `toHaveTextContent('')` (VH-04).

The *Name* is a plain `string`, narrowed by `isBlank` and `trim()` inside `submit`; no brand, no
wrapper.

**When INV-2 becomes true.** This decision describes the module *from slice 02 onwards*. INV-2 has
two halves and they arrive at different slices (design §5.2): the **trimmed** half is live at slice
01, where `submit` assigns `rawName.trim()` on its single, unguarded path; the **non-blank** half
arrives with `isBlank` at slice 02, which is the first slice whose scenarios can distinguish it.
Between those two slices `greetedName` can, in principle, hold `''` — no slice-01 scenario reaches
that state, and outside-in TDD is what forbids writing the guard before a scenario asks for it. This
is recorded here rather than left implicit so that the gap is a *sequenced* invariant, not a hole.

Note the boundary ADR-0007 draws around that argument, so it is not over-applied: what slice 01 lacks
is the **concept** of blankness — no `isBlank`, no blank branch, nothing a visitor can reach. Once a
concept exists, its rule is written whole in that same slice; a rule with one branch deliberately
left wrong is a shipped defect, not sequencing. INV-2's non-blank half qualifies as the former;
INV-5a's non-blank branch would have been the latter, which is why it arrives complete at slice 02.

## Consequences

**Positive**

- The seed's "no second source of truth" is structurally true: there is nowhere to store a
  divergent greeting.
- Rewording the greeting (or, later, localising it) is a one-function change with no state
  migration, because state holds the input to the rule, not its output.
- The 300-character scenario and the trimming scenarios exercise the same single code path.

**Negative / accepted**

- `greetedName` is a `string` whose "trimmed and non-blank" invariant is enforced by convention at
  one site rather than by the type system. Mitigation: `submit` is the only writer, `newVisit` the
  only other constructor, and INV-2 names the owner explicitly. If a second writer ever appears, the
  branded type (option 4a) becomes worth its cost and this ADR should be superseded.
- The greeting string is recomputed on every render. At this size that is free; it is noted only so
  nobody "optimises" it into stored state and reintroduces option 1.

## Related

ADR-0001 (the aggregate), ADR-0003 (where these functions live), ADR-0007 (absent concept vs.
half-written rule), VH-08 (trim semantics), VH-03 (the greeting/alert copy is unconfirmed).
