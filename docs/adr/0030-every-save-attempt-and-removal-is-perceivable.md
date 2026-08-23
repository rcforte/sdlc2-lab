# ADR-0030 — Every save attempt and every removal renews the region: one revision counter, one keyed node

- **Status:** Proposed — accepted pending the human VERIFY gate; the audibility half is contingent
  on `VERIFY-WITH-HUMAN.md` **VH-04** (a human listening check)
- **Date:** 2026-08-23
- **Feature:** `remembered-names` (`.sdlc2/features/remembered-names/design.md` §2.4 INV-21/P14/P15, §5.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Supersedes:** ADR-0023's mechanism (`saveCount` + a keyed child wrapping the region's whole
  text). Its requirement — *a save that appears to do nothing must not be silent* — stands and is
  widened to refusals and removals.
- **Relates to:** ADR-0009 (the counter-plus-key mechanism), ADR-0022 (the region is a named live
  section, never `role="status"`), ADR-0029 (`key={name}`), ADR-0031 (focus)

## Context

R25 says every save attempt and every removal must be perceivable, and the region is a polite live
region. A live region only speaks when its subtree **mutates**, so the failure mode is an outcome
that produces DOM identical to the DOM already there. There is exactly one such case now, and it is
new: pressing *Save this name* twice with the same name greeted produces the same refusal sentence
and the same rows. React reconciles it to no mutation at all, and the visitor gets silence from a
button they pressed twice.

Successful saves and removals mutate the list on their own, so they need no trick. The old
mechanism (ADR-0023) wrapped the region's whole text in one child keyed by `saveCount`. The region
is no longer one string: it now contains rows, and each row contains two focusable controls.

## Options considered

1. **Keep ADR-0023's shape: key the whole region body** by the revision counter.
   *Rejected.* It would tear down and rebuild every row's controls on every save attempt — five
   rows, ten buttons — which throws away the DOM identity `key={name}` is there to preserve
   (ADR-0029), and re-inserts unchanged rows into a live region so a screen reader hears the whole
   list again after a refusal about one name (N9).
2. **Re-render the list with `key={revision}` on the `<ul>`**, keeping rows keyed by name.
   *Rejected for the same reason* — the `<ul>`'s subtree is replaced, so every row is re-inserted.
3. **Toggle an `aria-live` re-announcement by clearing and re-setting the text in an effect.**
   *Rejected.* It needs a `useEffect`, a timer or a flag, invents state to work around the
   mechanism, and its correctness depends on ordering nothing in the suite can observe.
4. **`role="alert"` (assertive) for refusals.**
   *Rejected here, and it is a genuine product question rather than a technical one* — the seed puts
   refusals in the region and announces them politely, and the seed's own *Open questions* raises
   the interruption alternative. Overriding it in the design would be inventing product. Left where
   the seed left it; VH-04 carries it to the human.
5. **Accept the silence** on a repeated identical refusal.
   *Rejected.* It is the exact failure this codebase has designed against three times, and it is
   most likely to hit the visitor who cannot see the screen.
6. **One monotonic `savedNamesRevision`, and exactly one keyed node — the refusal `<p>`.** *(chosen)*

## Decision

- `savedNamesRevision` is incremented by `withSavedNames` (ADR-0027) on every write to the list:
  successful save, either refusal, and every removal. Commands that could not do anything return
  the input value and do not advance it. It is never branched on, never compared and never rendered
  as text.
- The component renders **one** keyed node: `<p key={visit.savedNamesRevision}>{refusalText(visit)}</p>`,
  present only when there is a refusal (P14). Rows are keyed by name (P15/ADR-0029) and are outside
  it; the save control is outside it too, and outside the rows.
- Nothing else in the region carries a changing key.

Measured rather than assumed (design §5.4): the same refusal twice yields a **different** `<p>` node
with the previous one detached (`isConnected === false`); an untouched row keeps its exact button
nodes across a removal; and the save control keeps both its node identity and its focus across a
refusal.

## Consequences

**Positive**

- Every outcome mutates the region, and each mutates only the part that changed: a refusal inserts
  one sentence, a save inserts one row, a removal removes one row.
- Focus behaviour falls out of the structure instead of being managed: no control lives inside the
  keyed node, so no control is destroyed by an outcome except the one the visitor removed
  (ADR-0031).
- `submit` never advances this counter and `save`/`remove` never advance `greetingCount`, so a save
  cannot re-announce the greeting and a greeting cannot re-announce the list (N10).

**Negative / accepted**

- **Whether any of it is actually spoken is invisible to this seam.** jsdom has no accessibility
  tree announcements; the suite can only assert `aria-live="polite"`, the correct text and the node
  swap. Audibility is **VH-04**, continuing `saved-name` VH-02/VH-04 and `greet-visitor` VH-09/VH-10.
- **The announcement now includes control names** — inserting a row inserts `Ada`,
  `Greet me again as Ada`, `Remove Ada`. Unavoidable given that rows must carry named controls and
  the region must announce; minimised by never re-inserting untouched rows; judged by a human (N9,
  VH-04).
- A counter in the aggregate exists solely to be a React key. Accepted precedent: ADR-0009 made the
  same trade twice, and the alternative is a component computing identity for a rule it does not own.

## Related

ADR-0009, ADR-0022, ADR-0023, ADR-0027, ADR-0029, ADR-0031, design §2.4, §5.4,
`VERIFY-WITH-HUMAN.md` VH-04.
