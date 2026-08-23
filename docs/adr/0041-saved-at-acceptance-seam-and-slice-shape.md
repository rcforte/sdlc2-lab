# ADR-0041 — The `saved-at` acceptance seam: narrowed fake timers, four red-first slices, no new component

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `saved-at` (`.sdlc2/features/saved-at/design.md` §5)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0005 (the acceptance seam per slice), ADR-0007 (invariants arrive whole),
  ADR-0025 and ADR-0033 (the component-extraction tripwire), ADR-0039 (the tick)

## Context

The project declares one seam: `frontend: React Testing Library + user-event via Vitest (jsdom)`,
with `npm test -- --run`. Every slice of every merged feature has been driven through
`render(<GreetingScreen />)` by role and accessible name.

This feature is the first whose subject is **time**. Its criteria say things like *"60 seconds pass
with the visitor doing nothing"* and *"more than 24 hours pass"*, which cannot be observed — they have
to be simulated. That drags a testing-infrastructure decision into architecture, because getting it
wrong does not produce a wrong answer; it produces a suite that hangs.

Two further questions arrive with the feature: whether any slice is a guard (the merged features
had four guards out of seven, argued at length), and whether the Saved names region finally becomes
its own component, since ADR-0033's tripwire — *extract when it needs state of its own* — is tripped
by `now` and `newestFirst`.

## Options considered

**A. How to control time.**

1. **`vi.useFakeTimers()` (everything) with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`** — the recipe every tutorial gives.
   *Rejected: it does not work in this repo, and it fails by hanging rather than by failing.* Measured:
   8 of 8 probe tests timed out at 5 s, each inside its first `await user.click(...)`. The cause is in
   `node_modules/@testing-library/dom/dist/helpers.js`: `jestFakeTimersAreEnabled()` starts with
   `if (typeof jest !== 'undefined')` and otherwise returns `false`. Under Vitest there is no `jest`
   global, so RTL believes timers are real and its async wrapper awaits a `setTimeout(0)` that has been
   faked and will never fire. `delay: null` does not help; the wrapper runs regardless.
2. **Define `globalThis.jest = { advanceTimersByTime: vi.advanceTimersByTime.bind(vi) }`** so RTL's
   detection passes.
   *Rejected, though measured to work.* It makes the suite lie about which runner it is on to satisfy a
   version check inside a dependency — a trick that will outlive everyone's memory of why it is there,
   and that breaks silently if RTL's detection changes.
3. **Drop `user-event` for the timing scenarios and use `fireEvent`.**
   *Rejected.* `CLAUDE.md` mandates `user-event` for interaction, and the reason is real: `fireEvent`
   dispatches events a real visitor cannot produce.
4. **Inject a fake clock into the component as a prop** and avoid fake timers.
   *Rejected.* It changes production code for the test's benefit, and it cannot simulate *"with the
   visitor doing nothing"* at all — something still has to make the interval fire.
5. **Fake only what the feature actually uses: `setInterval`, `clearInterval`, `Date`.** *(chosen)*

**B. Red-first or guard.** All four slices add capability that does not exist, so all four are
red-first. No argument for a guard slice is available and none is manufactured.

**C. Extract `SavedNamesRegion`?**
1. *Extract now* — the tripwire's first clause is met (the region needs `now` and `newestFirst`).
   *Rejected, for the second time and with a smaller majority.* `CLAUDE.md` requires every component
   to have a sibling test asserting behaviour through the rendered DOM, so extraction produces either
   a second test file duplicating scenarios that belong to the feature's one entry point, or an
   untested component. And `now` is not the region's state in any honest sense: it is the screen's
   reading of the outside world, which the region merely happens to be the only current consumer of.
2. *Keep one component, and sharpen the tripwire.* *(chosen)*

## Decision

**One seam for all four slices:** `src/GreetingScreen.test.tsx`, entry point
`render(<GreetingScreen />)`, queried by role and accessible name. `src/App.test.tsx` gains no `it`
(ADR-0005's tripwire). All 29 acceptance scenarios are driven through it; the per-slice queries are
tabulated in design.md §5.

**Time is controlled with:**

```ts
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] }))
afterEach(() => vi.useRealTimers())
// advance with:  await act(async () => { vi.advanceTimersByTime(60_000) })
// pin the wall clock with:  vi.setSystemTime(new Date(2026, 7, 23, 14, 20, 0))
```

`setTimeout` stays real, so `user-event` and RTL's async wrapper behave exactly as they do in every
other test in this suite — no `advanceTimers` option, no global shim. `vi.advanceTimersByTime` still
moves `Date.now()` and still fires the screen's interval, which is all the feature needs.

**All four slices are red-first.** The three re-save scenarios inside them are guards that pass by
construction if the moment is written once (INV-27); they are named in design.md §5.1 so nobody
weakens `save` to manufacture a red bar.

**No new component.** The tripwire is restated once more, and tightened so the next reader is not
having this argument a fourth time: **extract `SavedNamesRegion` when a second screen renders it, or
when it owns state that is genuinely about the region rather than about the screen — and extract it
together with its scenarios, not with a duplicate suite.**

## Consequences

**Positive**

- The suite keeps one entry point, one style of query, and one way of writing an interaction. Nothing
  about this feature's tests is special except the four lines that fake the clock.
- The hang is documented where a developer will meet it. Discovered by probe here; it would otherwise
  be found at 3 a.m. as "the test runner is broken".
- Simulating a full day costs ~5 ms (design.md §5.4), so issue 04 needs no timeout override and no
  shortcut around the real interval.

**Negative / accepted**

- **The `toFake` list couples the suite to `setInterval`.** If the tick is ever re-implemented as a
  `setTimeout` chain, the scenarios stop advancing it — silently, since nothing asserts the mechanism.
  Stated as a known coupling (design.md §2.5) and pinned by P25.
- **`GreetingScreen.tsx` reaches ~165 lines of JSX and four pieces of state**, and its test file
  passes ~109 scenarios. Both are past comfortable; the tripwire above is the agreed trigger, and the
  next feature that adds screen state should extract rather than re-argue.
- **A hidden dependency on a third-party implementation detail.** The recipe is chosen because of what
  is inside `@testing-library/dom` today. If that file's detection learns about Vitest, the full
  `useFakeTimers()` would work and this narrowing would look arbitrary — hence the citation, the
  measurement and this record.

## Related

ADR-0005, ADR-0007, ADR-0025, ADR-0033, ADR-0039, `CLAUDE.md` (the declared stack, seam and
commands), `.sdlc2/features/saved-at/design.md` §5.
