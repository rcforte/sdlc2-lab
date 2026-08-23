# ADR-0020 — `save(visit)` takes no name argument, and is total

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-22
- **Feature:** `saved-name` (`.sdlc2/features/saved-name/design.md` §2.4 INV-9/INV-10, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0019 (where the field lives), ADR-0002 (why `Name` is a plain `string`),
  ADR-0007 (invariants arrive whole)

## Context

Two rules meet in the save command, and both can be honoured or quietly violated by an
implementation that passes every scenario in some other slice:

- **R10** — saving captures *the name the visitor was greeted as*, **never** what is in the Name
  field. The seed spends a whole Decision on this: sourcing it from the field would let a visitor
  save a name they had never been greeted as, making "greet me again" a lie, and it would need its
  own blank-name rule, duplicating four decision records `greet-visitor` already spent.
- **R11** — there is nothing to save until there has been a greeting.

Story 1 has a scenario for the first (*"captures the greeting, never an untyped draft"*), but no
scenario can reach the second through the DOM, because the save control is absent before the first
greeting (P6). So R11's enforcement has to be decided here, in the design, or it will end up living
in a `&&` in JSX.

## Options considered

1. **`save(visit, name: string)`, symmetric with `submit(visit, rawName)`.**
   *Rejected.* The parameter is precisely the hole. Every call site then gets to choose what to
   save, and the one wrong choice — `save(visit, rawName)` — is the one closest to hand in the
   component, is a one-token typo away from correct, and produces a screen that looks right until
   a visitor saves without submitting. The scenario that catches it exists, but a design that
   relies on a scenario to catch a shape it could have made unwriteable has chosen worse.

2. **`save(visit, rawName)` with its own blankness/trimming rule**, so a visitor could save a draft
   they had never submitted.
   *Rejected outright — it is a different feature.* It contradicts R10 and the seed's Decisions,
   and it would duplicate INV-1/INV-2 in a second command, giving blankness two owners.

3. **`save(visit)` but with the "no greeting" guard left to the component** (`{greetedName !== null &&
   <button …>}` and nothing in the domain).
   *Rejected.* It makes the *absence of a button* the enforcement of a domain rule. That holds
   exactly as long as no second caller exists — and `greetAgain` already proves second callers
   happen in this feature. It also makes `save` partial in practice (`save` on a visit with no
   greeting would write `savedName: null`, an "empty save" that is indistinguishable in the type
   from never having saved, while `saveCount` advanced and the region re-announced nothing).

4. **`save(visit): Visit` — no name argument, with the guard inside, returning the input by
   identity when there is no greeting.** *(chosen)*

## Decision

```ts
export function save(visit: Visit): Visit {
  if (visit.greetedName === null) return visit
  return { ...visit, savedName: visit.greetedName, saveCount: visit.saveCount + 1 }
}
```

Two properties, deliberately:

- **The absent parameter is the guarantee.** `save` cannot see the Name field's draft — the draft is
  a component-local `useState` the domain module never receives — so R10 is not a rule anyone has to
  remember. There is no expressible way to save the wrong thing.
- **`save` is total.** With no greeting it returns the *same* value (identity, not a copy), so it is
  a no-op in every observable sense, `saveCount` does not advance, and nothing announces. P6 (the
  control's absence) is the **affordance**; INV-10 is the **rule**.

Because `savedName` is copied verbatim from `greetedName`, it inherits INV-2 — trimmed and non-blank
— with no second validation and no branded type (ADR-0002's reasoning, unchanged).

## Consequences

**Positive**

- Story 1's *"Saving captures the greeting, never an untyped draft in the Name field"* passes for a
  structural reason, and would keep passing if the scenario were deleted.
- INV-9 and INV-10 have one owner apiece, both openable in one four-line function.
- `save` composes safely: any future caller (a keyboard shortcut, a second control) gets both rules
  for free.
- Identity-return makes the no-op observable to a unit test without a DOM
  (`expect(save(newVisit)).toBe(newVisit)`, design §5.3) — cheap and unambiguous.

**Negative / accepted**

- **Asymmetry with `submit`**, which does take an argument. Accepted, and it is meaningful rather
  than accidental: `submit` is driven by something the visitor typed, `save` is driven by something
  the domain already holds. The asymmetry in the signature is the asymmetry in the domain.
- **INV-10 is not observable through the acceptance seam.** Mitigated by one named unit assertion in
  `src/visit.test.ts` (design §5.3), listed there so it is not read as drift from the repo's
  "behaviour through the rendered DOM" convention.
- A developer might read the guard clause as dead code, since P6 keeps the control absent. The
  design says why it is not (second callers, and the "empty save" failure mode above); the ADR is
  the durable answer.

## Related

ADR-0002, ADR-0019, ADR-0021, design §2.4 INV-9/INV-10, §4.1, §5.3.
