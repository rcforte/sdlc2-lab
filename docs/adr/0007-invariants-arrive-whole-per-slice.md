# ADR-0007 — An invariant arrives whole in one slice; slice 03 is a guard slice, not a red-first one

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-16
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` §2.4 INV-5a, §5.1, §5.2)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Supersedes:** the slice-03 row of ADR-0005's decision table, and ADR-0005's "slices 01–03 are
  red-first" rule (amended in place there, with a pointer here)

## Context

INV-5a says `lastSubmissionWasBlank` is written **only** by `submit`, and always describes the most
recent submission: `true` on the blank branch, `false` on the non-blank branch. It has two branches
and therefore two possible arrival points, and the choice between them is not free.

The arithmetic that raised the question: none of slice 02's five scenarios can observe the flag going
back to `false`. Its only multi-submission scenario ("A blank submission does not clear an existing
greeting") greets *first* and submits blank *second*, so within slice 02 the flag only ever travels
`false → true`. The first scenario in the whole contract that can tell the difference is slice 03's
*"Correcting a blank submission clears the alert and shows the greeting"*.

So a strict outside-in reading suggests: write only the blank branch at slice 02, and let slice 03's
scenario be the one that goes red and forces the other. That would make three of four slices
red-first instead of two. The counter-pressure is that ADR-0004 already refused the *same* trade for
slice 04 — declining to ship a known state leak for three slices in order to buy one red bar — so
the two decisions must agree or the design is arguing with itself. This ADR is the record the
earlier round of the design was missing: the choice was made in prose, with no options considered.

## Options considered

1. **Defer the non-blank branch to slice 03** to obtain a red bar. At slice 02 `submit` reads:

   ```ts
   if (isBlank(rawName)) return { ...visit, lastSubmissionWasBlank: true }
   return { ...visit, greetedName: rawName.trim() }        // flag carried through by spread
   ```

   and slice 03 changes the second line to assign `lastSubmissionWasBlank: false`.

   *Rejected.* Three reasons, in order of weight.

   - **It ships a user-visible accessibility defect for the length of a slice.** At the end of slice
     02, with all five of its scenarios green: a visitor submits blank, sees the alert, types
     "Grace", submits — the status region reads `Hello, Grace` **and** the alert *"Please enter your
     name to be greeted."* is still on screen, with the Name field's `aria-describedby` still
     pointing at it. A screen reader then announces an error as the description of a field that just
     succeeded. Slice boundaries are release boundaries in this graph; a slice is supposed to be
     shippable.
   - **It contradicts the design's own reasoning elsewhere.** ADR-0001's Context names precisely this
     symptom — "an alert that lingers next to a fresh greeting" — as the reason the greeting and the
     alert belong inside one aggregate. ADR-0004 then refuses an identical trade for slice 04. Taking
     it here and refusing it there is incoherent, and incoherence in the rationale is what makes a
     design impossible to argue with later.
   - **It requires the *less* obvious implementation.** The shape a developer reaches for when adding
     a blank branch —

     ```ts
     if (isBlank(rawName)) return { ...visit, lastSubmissionWasBlank: true }
     return { greetedName: rawName.trim(), lastSubmissionWasBlank: false }
     ```

     — already satisfies INV-5a whole. To get the red bar, the design would have to *prescribe* the
     spread-carrying variant on purpose. Manufacturing a failing test by specifying a worse
     implementation is not outside-in TDD; it is theatre with the same colour scheme.

2. **Write the flag on both branches at slice 02** (INV-5a whole), and accept slice 03 as a guard
   slice — the same label and the same treatment slice 04 already gets. *(chosen)*

3. **Merge slices 02 and 03** into one slice, so the recovery scenarios arrive with the code that
   makes them work and the slice is red-first again.
   *Rejected.* It contradicts the product contract's release order and the issue queue's `Blocked
   by:` chain (`01 ← 02 ← 03`), which the architect node does not get to rewrite; and it makes one
   slice of eight scenarios where the queue has two of five and three. The gain — a red bar — is not
   worth reorganising the agreed queue.

4. **Keep the two-branch write but add a slice-02 scenario that observes the flag returning to
   `false`,** so slice 02 covers what it implements.
   *Rejected — and out of bounds.* That means adding an acceptance criterion to issue 02, which the
   architect's mandate forbids ("do not touch any issue's acceptance criteria"). It is also
   unnecessary: slice 03's existing scenarios cover exactly that observation one slice later. Noted
   here because it is the option a reader will think of, and its rejection is procedural, not
   technical.

## Decision

**An invariant arrives whole, in the slice that introduces its concept.** INV-5a is written
completely at slice 02 — both branches of `submit` assign `lastSubmissionWasBlank` — and **slice 03
is a guard slice**: three scenarios, no production change expected.

The general rule this sets for the feature, stated so the developer can apply it without asking:

- *Deferring a **concept*** to the slice whose scenarios first need it is right and required. Slice
  01 has no blank-name concept at all: no `isBlank`, no flag, no alert. A visitor cannot reach a
  wrong state through a concept that does not exist.
- *Deferring **one branch of a rule that already exists*** is wrong. The concept is live, the visitor
  can reach the branch, and what they reach is a defect.

Absent concept, yes. Half-written rule, no.

> **Applied to ADR-0009's new rule (R9).** "Every submit is perceivable" spans both outcomes, so by
> this ADR's own test it is written as **two** invariants, not one: INV-8a (the success half) lands
> at slice 01 with the only branch `submit` has there, and INV-8b (the blank half) lands at slice 02
> with the rest of the blank-name concept. Neither is half-written at any boundary — at slice 01 the
> blank *concept* is absent, which this ADR permits; what it forbids is a live branch left wrong,
> and there is none. The slice-02 snippet above gains one counter per branch
> (`blankCount: visit.blankCount + 1` / `greetingCount: visit.greetingCount + 1`); it is still the
> shape a developer reaches for, so the ADR's "natural implementation is the correct one" property
> survives.

## Consequences

**Positive**

- No slice ships a state the visitor can reach and see as broken. Slice 02 is releasable as it
  stands: blank submits alert, corrected submits greet and the alert goes away.
- INV-5a as stated in design §2.4 is true of the code from the moment the code exists — the invariant
  table describes reality at every slice boundary, which is the whole point of writing one.
- The design is now consistent with itself: it refuses the "ship a known defect to buy a red bar"
  trade in both places it arises (here and slice 04, ADR-0004).
- The natural implementation is the correct one, so a developer who ignores this ADR entirely still
  gets it right. A design whose rules match what a competent developer would do anyway costs nothing
  to follow.

**Negative / accepted**

- **Only two of the four slices are red-first.** That is a real cost — the red bar is the cheapest
  evidence a test can fail — and it is why slices 03 and 04 are labelled loudly as guard slices in
  design §5.1 and in ADR-0005, so nobody reads a green first run as a broken workflow, and nobody
  "fixes" it by loosening the design.
- **The flag's `false` assignment is unobserved for one slice.** At slice 02 no scenario distinguishes
  it. Mitigation: slice 03's *"Correcting a blank submission clears the alert"* observes it one slice
  later, and design §5.1 lists it as one of the three wrong implementations that slice's guards catch.
  The cost of it being wrong for one slice is a red test in the next; the cost of the alternative was
  a defect in front of a visitor.
- **A developer following outside-in TDD mechanically may feel they are writing untested code at
  slice 02.** Anticipated and answered in design §5.2, with the exact distinction (absent concept vs.
  half-written rule) so the judgement is reusable rather than a one-off exception.

## Related

ADR-0001 (why a lingering alert beside a fresh greeting is the motivating symptom), ADR-0004 (the
same trade refused for slice 04), ADR-0005 (the seam table and the red-first/guard labels, amended by
this ADR), design §5.1–§5.2, `issues/02-blank-name-alert.md`, `issues/03-recover-from-alert.md`.
