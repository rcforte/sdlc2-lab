# ADR-0017 — The log region's visible focus indicator: the hook ships, the CSS rule is deferred to a named owner

- **Status:** Proposed — accepted pending the human VERIFY gate; the deferred half is contingent on
  the newly-appended `.sdlc2/features/greeting-log/VERIFY-WITH-HUMAN.md` **VH-08**
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` P6, P12, §5.6, §8)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0014 (the focus move this makes *visible*; that ADR handles the audible half),
  `VERIFY-WITH-HUMAN.md` VH-06 (audible half, human check), VH-08 (this, sighted half)

## Context

ADR-0014 decided that clearing is made perceivable by **moving focus** to the log region: the
control the visitor was on is destroyed by their own action, so focus must land somewhere real, and
the only DOM-observable half of that is `expect(logRegion).toHaveFocus()`.

`mockup.html` §5 (Keyboard and focus) makes a second, separate requirement normative, and it is not
about screen readers at all:

> The log region, though not tab-reachable, must also show a visible focus indicator when it
> receives programmatic focus after clearing — drawn here as
> `.greeting-log:focus { outline: 2px solid #1a1a1a; outline-offset: 2px; }`, deliberately `:focus`
> and not `:focus-visible`, because a script-driven `.focus()` call on a `tabindex="-1"` element
> does not match `:focus-visible` in Chromium — so a sighted keyboard user must still see where
> focus landed.

The mockup's reasoning holds and is if anything understated: the `:focus-visible` heuristic depends
on the visitor's *last* interaction modality, so a visitor who activates "Clear the log" **with a
mouse** gets no match at all, and one who activates it with the keyboard gets a match only by
browser-dependent inheritance. `:focus` is the only selector that fires in both cases. Without a
rule, a sighted keyboard visitor sees the log's contents vanish and has no signal that focus moved —
the same class of defect ADR-0014's option 4 (focus the Name field) was rejected to avoid, in the
other sense.

Two facts constrain the answer:

1. **`src/` contains no stylesheet, no `className`, and no CSS import** — not one, in either feature
   shipped so far. Both features put *"styling beyond what the existing markup implies"* explicitly
   out of scope.
2. **The declared seam cannot see CSS.** Probed on a throwaway copy against the installed toolchain
   (design §5.6): with this design's markup rendered and focus on the region,
   `getComputedStyle(region).outlineWidth` is `''`. Vitest does not process CSS by default, so a
   stylesheet added here would be inert in every test that runs, and a green suite would say nothing
   about whether the indicator exists.

## Options considered

1. **Ship the repo's first stylesheet in slice 02** — `src/index.css` with the two rules from the
   mockup, imported by `src/main.tsx`.
   *Rejected, for now.* It is a genuinely new pattern in a repo that deliberately has none, inside a
   behaviour slice whose feature puts styling out of scope, and (fact 2) no test in the declared
   seam could tell whether it worked or had a typo in the selector. That combination — new pattern,
   out of declared scope, unverifiable at the seam — is precisely what a human gate is for. It is
   the *cheapest* option to adopt later: one file, one import, no dependency, no component edit.
2. **Inline `style` on the `<section>`.**
   *Rejected — impossible.* An inline style declaration cannot express a `:focus` pseudo-class. The
   only inline-able variant is a permanent outline (an outline on an element that is *not* focused),
   which is worse than nothing: it says "focus is here" at all times, including on arrival.
3. **Make the region tab-reachable (`tabIndex={0}`) so the browser's default `:focus-visible` ring
   applies.**
   *Rejected.* It contradicts the seed and `mockup.html` (the region is deliberately *not* in the
   tab order), adds a tab stop every keyboard visitor must pass on every pass through the screen,
   and still would not draw a ring after a **mouse**-driven clear, because that is a
   `:focus-visible` case too. It buys a partial fix by breaking an agreed requirement.
4. **Toggle a class from the clear handler** (`setState({ justCleared: true })` → a permanent
   outline class) instead of relying on `:focus`.
   *Rejected.* It puts focus *appearance* into React state, so the design would then need a rule for
   when it is removed (blur? next submit? a timer?) — a whole state machine to reimplement, worse,
   what one CSS pseudo-class already does, and it still needs a stylesheet to be visible.
5. **Ship the DOM hook now, defer the rule to a named owner, and record it.**

## Decision

**Option 5**, in two explicitly separated halves:

- **Now (slice 02, part of P6):** the log region carries `className="greeting-log"` — `mockup.html`'s
  own normative selector. One attribute, zero behaviour, zero tests, and it means whoever owns
  styling never has to edit `GreetingScreen.tsx` to satisfy this requirement.
- **Deferred, with an owner named:** the rule itself,

  ```css
  .greeting-log:focus {
    outline: var(--focus-ring-width, 2px) solid #1a1a1a;
    outline-offset: var(--focus-ring-offset, 2px);
  }
  ```

  is owned by the **frontend-design node / the human VERIFY gate**, and recorded as **VH-08** with
  the exact declaration, the reason it must be `:focus`, and the one-file change that adopts it
  (`src/index.css` + `import './index.css'` in `src/main.tsx`; Vite handles CSS natively, no new
  dependency).

The parallel to ADR-0014/VH-06 is deliberate and is the point: the *audible* outcome of the focus
move is a human check, and so is the *visible* one. Neither is faked with a jsdom assertion that
would pass whether or not the mechanism works — the reason VH-02 and `greet-visitor` VH-10 exist.

## Consequences

**Good.**
- The requirement is **owned**, written verbatim, and traceable (design §8's "not a scenario"
  table), rather than living only in the mockup where no downstream node has to read it.
- No unverifiable artifact ships inside a behaviour slice, and the repo's zero-CSS convention is
  broken only by a human decision, not by an architect's aside.
- Adoption is one file and one import; rejection is deleting one attribute with no other consumer.

**Bad / accepted.**
- **Between slice 02 landing and VH-08 being answered, the sighted-keyboard gap is real**: focus
  moves and nothing is drawn. This is stated rather than hidden; it is the smaller half of a
  requirement whose larger half (focus actually moving, and there being text to read) does ship.
- `className="greeting-log"` is, for that window, a hook with no consumer — the exact "interface
  wider than the work behind it" smell the deepening pass hunts. It is one attribute, and design §7
  item 5 names all three ways it resolves.
- If the answer is "frontend-design owns it", the tokens `--focus-ring-width` / `--focus-ring-offset`
  (fixed normatively by `greet-visitor/mockup.html`) must be defined wherever that stylesheet lands;
  the fallbacks in the rule above mean a missing definition degrades to `2px`, not to nothing.

## What would change this

A human answering VH-08 with "ship it here" (then option 1, immediately, with the rule above), or a
frontend-design node entering this repo with a stylesheet of its own (then the rule moves there
unchanged). A third trigger: if the log region ever *does* become tab-reachable for some other
reason, revisit — `:focus-visible` would then cover the keyboard case and only the mouse-driven
clear would still need `:focus`.
