# ADR-0015 — The acceptance seam for `greeting-log`: all 18 scenarios through `render(<GreetingScreen />)`; `App.test.tsx` stays at one `it`

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` §5, §5.1, §5.3)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0005 (the seam rule this applies and whose tripwire it honours), ADR-0003
  (`src/visit.test.ts` as an inner cycle), ADR-0007 (guard slices)

## Context

The project declares its seam:

```yaml
commands: { test: "npm test -- --run", build: "npm run build" }
seam:     { backend: "", frontend: "React Testing Library + user-event via Vitest (jsdom)" }
```

ADR-0005 then split the existing suite by *subject*: `src/App.test.tsx` holds the walking-skeleton
scenario because it asserts **composition** (the `sdlc2 lab` heading co-existing with the greeting);
everything else is driven at `render(<GreetingScreen />)`; and the deepening pass set a tripwire —
*"`src/App.test.tsx` should contain exactly one `it`; a second one means the file has started
duplicating `GreetingScreen.test.tsx`."*

This feature also has a scenario labelled *SKELETON* (Story 1's first). The obvious move — skeleton
scenarios go in `App.test.tsx` — would trip that wire on its first use. So the placement has to be
decided on the rule, not the label.

## Options considered

1. **Put this feature's skeleton scenario in `src/App.test.tsx`** because it is called the walking
   skeleton.
   *Rejected.* ADR-0005's criterion is *composition*, not the label: `App.test.tsx` earns its
   scenario by asserting that two components render together. This feature's skeleton asserts a
   greeting, a log entry, a heading and an absent empty-message — every one of them inside
   `GreetingScreen`. Adding it there would duplicate coverage, slow the composition test, and trip
   ADR-0005's own tripwire on the very first opportunity.
2. **Move everything to `render(<App />)`** for realism.
   *Rejected*, for ADR-0005's original reason: all 18 scenarios would then depend on the shell, and a
   change to the banner could redden the log's tests.
3. **A new test file per slice** (`greetingLog.test.tsx`, `clearLog.test.tsx`).
   *Rejected.* `CLAUDE.md` fixes the convention as a **sibling test per component**, and these
   scenarios are all behaviour of `GreetingScreen`. Splitting by slice would leave the repo with
   files named after issues rather than after code, and no natural home for the fresh-visit guards.
4. **Snapshot-test the log region** instead of querying roles.
   *Rejected.* `CLAUDE.md` requires assertions through roles and accessible names; a snapshot pins
   markup, reddens on every cosmetic change, and would pass against a log rendered as `<div>`s that
   no assistive technology reads as a list.
5. **All 18 scenarios at `render(<GreetingScreen />)` in `src/GreetingScreen.test.tsx`,
   `App.test.tsx` untouched.**

## Decision

Option 5. Per slice:

| Slice | Issue | Kind | Seam |
| --- | --- | --- | --- |
| 01 | `01-see-the-greeting-log-grow` | red-first | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` — 8 scenarios |
| 02 | `02-clear-the-greeting-log` | red-first | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` — 8 scenarios |
| 03 | `03-fresh-visit-starts-with-an-empty-log` | **guard slice** | `src/GreetingScreen.test.tsx` · `render` → interact → `unmount()` → `render` — 2 scenarios |

`src/visit.test.ts` keeps its established role as the inner cycle (ADR-0003): the new assertions
there are about the pure module (append order, blank carrying the same array through, `clear`'s
untouched fields, `clear`'s idempotence) and are not acceptance steps.

Slice 03 is a **guard slice** under ADR-0007's rule: because the log lives inside `Visit`
(ADR-0010) and `Visit` lives in component-local `useState` (ADR-0004), its two scenarios pass on the
first run. That is the intended outcome; the developer must not loosen the design to manufacture a
red bar. They fail the moment someone hoists the state — the realistic regression.

## Consequences

**Good.**
- One entry point for the whole feature; the unit under test is also the unit whose remount *is* a
  fresh visit (`greet-visitor` VH-02), so slice 03 needs no new machinery.
- ADR-0005's tripwire survives intact and gains a worked example of how to read it.
- Every mechanic the scenarios depend on was probed against the installed toolchain (design §5.3):
  the `region` query needs the accessible name, focus needs `tabIndex={-1}`, exact `<li>` text needs
  the `toEqual`-on-`textContent` form rather than `toHaveTextContent`, and the tab order is
  Name → Greet me → Clear the log.

**Bad / accepted.**
- `src/GreetingScreen.test.tsx` grows from 17 tests to 35. It is the price of the sibling-test
  convention; the mitigation is `describe` blocks per issue, matching the existing file's shape.
- Composition is asserted by exactly one test for the whole repo. If the log ever fails to appear
  under `<App/>` while passing under `<GreetingScreen/>`, no test catches it — accepted, because
  `App.tsx` renders `<GreetingScreen/>` whole and the alternative is duplicating 18 scenarios.

## What would change this

A scenario that genuinely asserts composition (the log next to the banner, or a second screen), or a
second component owning part of the log's markup (ADR-0016) — either would give `App.test.tsx` a real
second subject, and the tripwire would then be read, not tripped.
