# ADR-0047 — The offer is presented like the controls it sits among: the component names it, and pressing it reuses the removal's rules

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Amended by:** **VH-01's resolution (2026-08-24)**, which changed the label to `Bring back
  <name>`. The two places below that spell `Bring Ada back` — the rejected domain-projection option,
  and the JSX of the option chosen — are the words as this record left them, and are stale in that
  one respect only. Everything else stands and is load-bearing: the component still names the
  offer, the name is still interpolated into a template rather than composed by the domain, and
  pressing it still reuses the removal's rules. The change strengthens this record's own title —
  `Remove <name>` and `Greet me again as <name>` both end with the name, and the offer was the one
  control that did not, so putting the name last is what *presented like the controls it sits
  among* asks for. It also survives a name that is not a name, which the old shape did not.
- **Date:** 2026-08-23
- **Feature:** `undo-a-removal` (`.sdlc2/features/undo-a-removal/design.md` §2.5, §4.3)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0003 (the domain owns visitor-facing message text), ADR-0022 (the saved-name
  region is a named live section), ADR-0029 (row commands address a row by name), ADR-0031 (removing
  moves focus, and Remove comes last), ADR-0043 (the offer never refuses), ADR-0046 (the offer ages by
  projection)

## Context

Three presentation questions arrive together, and each has a merged answer nearby that could be
followed or deviated from. Answering them in one record keeps the reasoning in one place, because
they share a premise: **the offer is a control, and this screen already has rules for controls.**

- **Where do its words live?** ADR-0003 says the domain owns visitor-facing text so a reader opens one
  file to know what the screen says — yet `Remove <name>`, `Greet me again as <name>` and `Save this
  name` are all written in the component today.
- **What does pressing it do about focus?** It destroys the control that was pressed, which is exactly
  what removing does (ADR-0031/P19).
- **Which reading of the clock does the press use?** `saveTheGreetedName` takes a fresh `nowMs()` in
  the handler (P26). The offer's *visibility* was already decided by the `now` the render used
  (ADR-0046), so a fresh reading would be a second, later opinion.

## Options considered

**A. The offer's words.**

1. **A domain projection `offerText(visit, now): string | null` returning `"Bring Ada back"`.**
   *Rejected.* It would make ADR-0003's promise truer by one sentence and unanswerable by one rule:
   two of the three name-bearing control labels would be in `GreetingScreen.tsx` and the third in
   `visit.ts`, split by which feature happened to add them. The practice this repo actually follows,
   written down in the `saved-at` design, is **the domain owns messages, the component owns element
   shape and control names** — and the offer is a control name.
2. **A domain projection returning the *name*, and the component writing the sentence.** *(chosen)* —
   `offeredName(visit, now): string | null`, exactly the shape of `newestSavedName`, whose marker word
   `Newest` is likewise the component's.
3. **The component reading `visit.lastRemoval?.entry.name` directly.** *Rejected.* It would let the
   component decide whether an offer stands, which is INV-38's job, and would put the day-old rule in
   two places the first time someone forgets.

**B. Focus after the press.**

1. **Send focus into the restored row.** *Rejected, and the seed rejects it first:* it would land the
   visitor one tab-stop from the `Remove` control that started this.
2. **Leave focus where it was.** *Rejected.* The control that had focus no longer exists, so the
   browser drops focus to `<body>` and a keyboard visitor restarts from the top of the page.
3. **Send focus to the Saved names region, exactly as removing does.** *(chosen)* — one rule for the
   screen rather than two: a control that destroys itself by being pressed sends focus to the region,
   which then announces its own new contents.

**C. Which `now` the press uses.**

1. **A fresh `nowMs()` in the handler, matching `saveTheGreetedName`.** *Rejected*, and the symmetry
   is the trap. A save *records* a moment, so it wants the most accurate reading available. The offer
   only re-checks a cutoff the render has already checked; a later reading can disagree with the
   render that drew the button, and the visitor then presses a control that does nothing — the one
   outcome ADR-0043 exists to prevent.
2. **Drop the check from `bringBack` and let the rendered condition be the only gate.** *Rejected.*
   A rule whose only enforcement is a JSX condition is enforced in the wrong layer; `remove` and
   `greetAgain` both carry a `holds` guard they can never fail from this component, for the same
   reason.
3. **Pass the `now` this render already used.** *(chosen)*

## Decision

```tsx
const offered = offeredName(visit, now)

const bringTheNameBack = () => {
  setVisit((current) => bringBack(current, now))   // the render's reading, not a fresh one
  savedNamesRegion.current?.focus()                // P19's second member
}

{offered !== null && (
  <p>
    <button type="button" onClick={bringTheNameBack}>Bring {offered} back</button>
  </p>
)}
```

The element sits **inside the Saved names region, after a standing refusal and before the sort
control** — the band the seed points at (*"where the refusal message already sits"*) and the order the
mockup draws. It is **outside** the empty-state/rows branch, so removing the last name shows the empty
state *and* the offer, with the sort control still absent. It is **absent, never disabled** (P17's
rule, applied a third time), and it carries **no `key`**: there is only ever one offer, so a different
name changes the button's text and a returning offer is a fresh node.

P26 is untouched: `now` is a value this render already holds, not a clock read inside a state updater.

## Consequences

**Positive**

- Three control names, one file, one shape. A reader asking "where are the button labels?" gets one
  answer.
- **A visible offer can never be inert.** The control exists because `stands(held, now)` was true and
  the command tests the same number, which is ADR-0043's *"present and certain to work"* made literal
  rather than asserted.
- Focus behaviour needs no new rule and no new test technique: the merged removal scenarios already
  establish the pattern, and the assertion is the same one.
- The offer's arrival is announced for free — a node added to a polite live region the removal has
  just given focus to — with no `key`, no revision trick and no second mechanism.

**Negative / accepted**

- **`bringBack`'s guard is unreachable from this component**, precisely because the render and the
  press share a number. It is kept anyway, as the `holds` idiom already kept in `remove` and
  `greetAgain`, and it is pinned by a unit assertion (design.md §5.3) rather than by a scenario that
  cannot exist.
- **The offer's words are outside the domain**, so ADR-0003's *"read `visit.ts` to know what the screen
  says"* is one sentence less true. It was already three control names less true; this records the
  boundary as **messages vs. control names** rather than letting it erode further.
- **A ≤15 s window** in which the render's `now` is older than the wall clock, so an offer may be
  pressed just past its cutoff and the restored row leaves on the next tick. That is the tick's
  staleness (N17/N20), shared with every age reading on screen, and it is unreachable in practice
  because a visit dies at unmount.
- **The offer sits inside a live region**, so its appearance changes that region's contents. Wanted
  here (the visitor should hear what just became available) and consistent with the sort control's
  known placement, but it is verbosity nobody has heard yet: VH-02, VH-03.

## Related

ADR-0003, ADR-0022, ADR-0029, ADR-0031, ADR-0043, ADR-0046,
`.sdlc2/features/undo-a-removal/design.md` §2.5, §4.3 (P28, P29), and `mockup.html` (the order inside
the region).
