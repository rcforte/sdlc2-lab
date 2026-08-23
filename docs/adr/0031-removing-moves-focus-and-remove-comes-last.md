# ADR-0031 — Removing moves focus to the region; saving and greeting again move nothing; the destructive control comes last in a row

- **Status:** Proposed — accepted pending the human VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `remembered-names` (`.sdlc2/features/remembered-names/design.md` §2.4 P16/P19, §5.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0014 (the same mechanism, decided for `greeting-log`'s Clear on an unmerged
  branch), ADR-0029 (`key={name}`, so only the removed row's nodes go), ADR-0030,
  `saved-name` VH-ux-02 (focus stays on the activated control after greeting again — closed,
  human-confirmed)

## Context

Two decisions have to be made about a row, and the acceptance criteria fix one of them and
deliberately leave the other open.

**Fixed:** *"Removing moves focus to the Saved names region, which then announces its new contents.
The control that was pressed no longer exists to hold focus."* And: *"Saving does not move focus."*
Removing is the only action here that destroys the control that triggered it. Left alone, focus
falls to `document.body`: the visitor is dumped at the top of the document, hears nothing, and has
to find their way back to a list that just changed.

**Open:** the product brief's final paragraph hands one question to this node — *which of a row's
two controls reads first*. The seed fixes both names and that a row carries both; no scenario
depends on the order.

## Options considered

**Where focus goes after a removal**

1. **Nowhere — let it fall to `document.body`.** *Rejected*; it is the default a developer gets for
   free, and it is the failure described above. It is also unobservable to a sighted mouse user,
   which is how it survives review.
2. **The next (or previous) row's control.** *Rejected.* It needs a rule for the last row, a second
   rule for the only row, and it parks focus on a **destructive** control the visitor did not
   choose — one more keystroke removes another name. `greet-visitor`'s house style is one rule with
   no special cases.
3. **The Name field.** *Rejected.* It steals the caret into the visitor's unsubmitted draft (which
   removal must leave alone), and announces the field rather than the outcome.
4. **The save control.** *Rejected.* It may not exist (there has been no greeting), and it says
   nothing about what changed.
5. **The region itself, made focusable with `tabIndex={-1}`, focused imperatively in the remove
   handler.** *(chosen)* — the same answer ADR-0014 reached for the greeting log's Clear, which is
   the same problem: the pressed control is destroyed by its own effect.
6. **The same, but in a `useEffect` keyed on the list shrinking.** *Rejected.* It would need a flag
   to distinguish "a removal happened" from "this render happens to have fewer names", i.e. state
   invented to work around the mechanism. The region is guaranteed mounted (P13), so the imperative
   call is both simpler and exact — and measured to work (design §5.4).

**Which row control comes first**

7. **`Remove <name>` first**, then *Greet me again*. *Rejected.* It puts the destructive control
   first in tab order and first under a pointer sweeping the row, on the same row as the control a
   visitor is far more likely to want.
8. **Greet-again first, remove last.** *(chosen)* — and it is `mockup.html`'s order in all six
   screens that show a row, so the design, the mockup and the built screen agree.

## Decision

- The region carries `tabIndex={-1}` — never `0`, it must not become a tab stop — and keeps its
  accessible name from the visible `<h2>` (ADR-0022).
- The remove handler is exactly `setVisit(v => remove(v, name)); savedNamesRegion.current?.focus()`.
  **No other handler in `GreetingScreen` calls `focus()`** (P19): saving keeps focus on the save
  control and greeting again keeps focus on the row's control, both because those controls survive
  their own activation (P12, ADR-0029, ADR-0030) — `saved-name` VH-ux-02, honoured unchanged.
- A row renders, in DOM order: the name, `Greet me again as <name>`, `Remove <name>`.

## Consequences

**Positive**

- Focus lands somewhere real and named, and the destination **is** the thing that changed; the
  region's polite live text is then the first thing read.
- One rule, no special case for removing the last name — the empty state appears inside the very
  element that just received focus.
- Verified through the declared seam: `expect(region).toHaveFocus()`, one DOM observation, which
  fails against the do-nothing default. Measured to survive the re-render (design §5.4).
- No new state, no effect, no extra copy: `tabIndex={-1}` and the existing ref are the whole
  mechanism.
- The destructive control is never where a visitor lands by accident — not by tab order, not by
  focus move, not by pointer sweep.

**Negative / accepted**

- **Whether a screen reader reads the region's new contents on receiving focus** is not observable
  in jsdom. Routed to **VH-04**, exactly as ADR-0014 routed its own listening check.
- Focusing a container rather than a control is unusual, and a visitor who then presses Tab lands
  on the first row control rather than back where they were. Accepted: it is the same trade
  ADR-0014 made, and the alternative (option 2) is worse in a way that removes data.
- `tabIndex={-1}` is load-bearing and looks decorative; without it `.focus()` is a silent no-op.
  Noted at the element and asserted by issue 03's focus scenarios.

## Related

ADR-0014, ADR-0022, ADR-0029, ADR-0030, `saved-name` VH-ux-02, design §2.4 (P16, P19), §5.4.
