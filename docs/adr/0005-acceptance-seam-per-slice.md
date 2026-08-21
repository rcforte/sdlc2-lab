# ADR-0005 — The acceptance seam: DOM tests per slice, `App` for composition, `GreetingScreen` for behaviour

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-15
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` §5)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)

## Context

Every one of the four slices must be driven from the outside by a failing acceptance test before any
production code is written, and the project declares the seam it uses:

```yaml
seam:
  backend:  ""
  frontend: "React Testing Library + user-event via Vitest (jsdom)"
commands:
  test:  "npm test -- --run"
```

One wrinkle decides the rest: Story 1's skeleton scenario asserts the **existing heading `sdlc2 lab`
is shown, and still shown after submitting** — a statement about the *composition* of the app shell
with the new screen, which `render(<GreetingScreen />)` alone cannot observe. Meanwhile Story 4's
"fresh visit" needs an unambiguous unit to unmount and re-mount (VH-02), and `CLAUDE.md` requires
every component to have a sibling test asserting behaviour through the DOM.

## Options considered

1. **Everything through `render(<App />)`, in `src/App.test.tsx`.**
   *Rejected.* All sixteen scenarios (6 + 5 + 3 + 2 across issues 01-04) would then depend on the
   shell, and `GreetingScreen` would
   ship without the sibling test the repo convention requires. It also blurs Story 4: remounting
   `App` proves the shell was recreated, not that the greeting screen owns its state.

2. **Everything through `render(<GreetingScreen />)`.**
   *Rejected.* The heading steps in Story 1's first scenario become untestable, and the walking
   skeleton stops being end-to-end — it would no longer prove the new screen is actually wired into
   the app the visitor loads. A skeleton that never touches the composition root is not a skeleton.

3. **A browser-level E2E runner (Playwright/Cypress) as the outer seam,** with jsdom tests inside.
   *Rejected.* `CLAUDE.md` rules Playwright and Cucumber deliberately out for this repo, and VH-02
   already decided that a real reload is a human check rather than a reason to change the stack. A
   second test stack for four scenarios' worth of extra fidelity is disproportionate.

4. **Testing the rules through `renderHook` or by importing `visit.ts` directly as the
   acceptance seam.**
   *Rejected as the* **outer** *seam.* It asserts implementation, not behaviour, which the repo
   convention forbids; a suite that is green while the button is unlabelled would be worthless.
   (Module-level tests remain fine as an *inner* cycle — ADR-0003.)

5. **Split by subject: composition scenarios at the `App` seam, screen behaviour at the
   `GreetingScreen` seam — one scenario, one test, never split across files.** *(chosen)*

## Decision

Two entry points, assigned per scenario (never per assertion), all within the declared seam:

| Slice / issue | Seam file · entry point | Scenarios |
| --- | --- | --- |
| 01 | `src/App.test.tsx` · `render(<App />)` | *Visitor is greeted by the name they typed* — the walking-skeleton scenario, and the only one asserting the heading. It asserts everything its Gherkin says, greeting text and button name included; that is composition-through-behaviour, not duplication. |
| 01 | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | status region present & empty at rest · trims spaces · trims tabs · no length limit · new name replaces previous greeting |
| 02 | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | all five blank-name scenarios, incl. the `aria-describedby` linkage |
| 03 | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | all three recovery scenarios (**guard slice** — ADR-0007) |
| 04 | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` → `unmount()` → `render(<GreetingScreen />)` | both fresh-visit scenarios |

Rules that go with it:

- A scenario is one `it(...)`; it is never split across the two files.
- **Slices 01 and 02 are red-first; slices 03 and 04 are guard slices** (design §5.1). *(Amended:
  this ADR originally said "01–03 are red-first". ADR-0007 supersedes that row — see below.)* Slices
  01 and 02 each have scenarios that cannot pass until production code changes. Slices 03 and 04 do
  not, and are labelled as such rather than leaving the developer to manufacture a red bar:
  - **Slice 03** would only be red-first if slice 02 shipped INV-5a's blank branch alone, leaving a
    lingering alert beside a fresh greeting for one whole slice. ADR-0007 weighs that trade in full
    and rejects it, so INV-5a arrives whole at slice 02 and slice 03's three scenarios pin it. They
    are not tautologies: each fails against a specific plausible wrong implementation (design §5.1
    lists all three).
  - **Slice 04**: given ADR-0004, its two scenarios pass on first run, and they exist to *pin* that
    (they fail for any future lift of the state out of the component).
  Both refusals are the same trade refused twice, deliberately: a red bar is not worth shipping a
  known, visitor-visible defect for the length of a slice.
- **One non-DOM test exists in the feature**, and it is named so it is not mistaken for drift: the
  INV-6b purity assertion in `src/visit.test.ts`, landing with the module in slice 01 (design §5.3,
  ADR-0008). It asserts a structural property of one non-component module that no scenario can
  observe; it is not part of the acceptance seam and changes no scenario.
- Queries are by role and accessible name (`getByRole('button', { name: 'Greet me' })`,
  `getByLabelText('Name')`, `getByRole('status')`, `queryByRole('alert')`), matching the existing
  `AppBanner.test.tsx` style and the contract vocabulary verbatim.
- Interactions use `userEvent.setup()` and are awaited. Tabs are **pasted into the focused field**,
  not typed: `await user.tab()` (or `await user.click(nameField)`) then `await user.paste('\tAda\t')`.
  A literal Tab keystroke moves focus (VH-08); `user.type(field, '{{Tab}')` inserts the five
  characters `{Tab}` rather than U+0009, which would break slice 01's tab scenario and silently
  un-blank slice 02's; and `user.paste()` in user-event v14 targets `document.activeElement`, so
  pasting without focusing first pastes nowhere. Design §5's "Seam mechanics" list carries the same
  code.
- **The two primary paths are driven keyboard-only**, adopting `mockup.html` §7's directive rather
  than declining it silently: `await user.tab()` → `user.keyboard('Ada')` → `user.tab()` →
  `user.keyboard('{Enter}')` for the walking skeleton (slice 01) and for the recovery scenario
  (slice 03, with `user.tab({ shift: true })` to get back to the field). Verified on the installed
  `user-event` 14.6.4: `{Enter}` activates a focused native button with or without a surrounding
  `<form>`, so this is compatible with either VH-01 shape; Space is a literal `' '` in v14, and
  `'{Space}'` is not a key descriptor — it throws nothing and activates nothing, which would leave a
  scenario asserting against an unsubmitted screen. No acceptance criterion requires keyboard
  operability either way, so this is a design choice, recorded here rather than left to chance.
- A **fresh visit** is `unmount()` + a second `render`, not `window.location.reload()` (no
  navigation in jsdom — VH-02) and not a `key` change (that would test React, not the visitor's
  experience).
- **The duplication tripwire is a count, not a subject.** `src/App.test.tsx` contains **exactly one
  `it`** — the walking-skeleton scenario *Visitor is greeted by the name they typed*, with all of
  its steps. A **second** `it` appearing in that file is the signal that the suite has started to
  duplicate `GreetingScreen.test.tsx`, and the new one belongs there instead. (Stated this way
  because the skeleton scenario necessarily asserts greeting behaviour — "the greeting reads
  `Hello, Ada`", "the submit control has the accessible name `Greet me`" — so a rule phrased as
  "no greeting behaviour in `App.test.tsx`" would fire on the very scenario assigned to it and
  leave the composition untested.)

## Consequences

**Positive**

- Each slice is driven end to end through the project's declared seam, with the entry point named
  before a line is written; the walking skeleton genuinely runs from the app's root.
- `GreetingScreen` gets the sibling test the repo convention requires, without duplicating the
  shell's assertions.
- Story 4's remount has one unambiguous subject — the component that owns the state (ADR-0004).

**Negative / accepted**

- Slice 01 touches two test files. Accepted: it is one scenario in one, five in the other, split by
  subject rather than convenience.
- `App.test.tsx` is a new file for a component that previously had no test — a pre-existing gap in
  the convention, closed here rather than widened.
- Nothing in this suite exercises a real browser: real reload behaviour and the "no colour-only
  error signal" rule stay human VERIFY checks (VH-02, VH-07). That limitation is chosen knowingly,
  not overlooked.

## Related

ADR-0003 (inner cycle vs. outer seam), ADR-0004 (what a remount proves), ADR-0007 (which supersedes
this ADR's original "slices 01–03 are red-first" rule), ADR-0008 (the one non-DOM test), VH-02,
VH-07, VH-08, `CLAUDE.md` sdlc2 block (the declared seam and commands).
