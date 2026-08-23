# ADR-0025 — One acceptance seam for the whole feature: `GreetingScreen.test.tsx`; no `App` scenario, no new component; 01–03 red-first, 04–05 guards

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-22
- **Feature:** `saved-name` (`.sdlc2/features/saved-name/design.md` §5, §5.1, §5.2, §5.3)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0005 (the two entry points and the duplication tripwire), ADR-0007
  (invariants arrive whole; guard slices), ADR-0004, ADR-0019

## Context

Five slices, 27 scenarios, one declared seam:

```yaml
seam:   { backend: "", frontend: "React Testing Library + user-event via Vitest (jsdom)" }
commands: { test: "npm test -- --run", build: "npm run build" }
```

Three questions have to be answered before a line is written, and each has a wrong answer that
looks reasonable:

1. **Which entry point?** `greet-visitor` established two — `render(<App />)` for its one
   composition scenario, `render(<GreetingScreen />)` for everything else — plus a tripwire:
   *a second `it` in `App.test.tsx` is the signal that the suite has started to duplicate itself.*
2. **Does the Saved name region become its own component?** `CLAUDE.md` says components live one per
   file with a sibling `*.test.tsx`; so extracting one is also a decision about where scenarios live.
3. **Which slices can actually go red first?** ADR-0007's rule — *absent concept, yes; half-written
   rule, no* — decides this, and the answer is not "all of them".

## Options considered

1. **Add a walking-skeleton scenario at the `App` seam**, mirroring `greet-visitor` slice 01.
   *Rejected.* No acceptance criterion in this feature mentions the app shell — the seed extends the
   backbone at *"See the greeting"*, which is inside `GreetingScreen`, and the composition is
   already pinned by the existing `App.test.tsx` scenario. Adding one would trip ADR-0005's
   duplication tripwire on purpose, and it would assert a wiring that nothing in this feature can
   break (this feature adds no component to wire).

2. **Extract a `SavedNameRegion` component** with its own `SavedNameRegion.test.tsx`.
   *Rejected — for now, with a named tripwire.* It would own no state and no rule; it would need
   `visit` plus two callbacks drilled in; and `CLAUDE.md`'s sibling-test rule means the extraction
   either duplicates the same scenarios in a second file or leaves a component untested. The
   region's markup is ~10 lines. **Extract when** a second screen needs the region, **or** when
   `GreetingScreen.tsx` acquires a third piece of state that no other part of it reads — neither is
   true after slice 05. (This is the "interface wider than the work it does" check, run and
   answered, not skipped.)

3. **Drive the rules directly** (`renderHook`, or importing `visit.ts` as the acceptance seam).
   *Rejected as the outer seam* — the repo convention is behaviour through the rendered DOM, and a
   suite that is green while the button is unlabelled is worthless. Inner-cycle module tests remain
   fine and are named exhaustively (design §5.3: three assertions, no more).

4. **A browser E2E runner** for the live-region and reload questions.
   *Rejected.* `CLAUDE.md` rules Playwright and Cucumber deliberately out, and both questions are
   already routed to human checks (VH-02 here; `greet-visitor` VH-02 for reload).

5. **Make slices 04 and 05 red-first** by deferring "replace" and by parking the state somewhere
   that survives a mount.
   *Rejected.* Both are ADR-0007's forbidden move: a live concept with a branch left wrong. Deferring
   replace ships a button labelled *Save this name* that visibly does nothing for a whole slice;
   parking the state ships the exact leak Story 5 exists to prevent. Manufacturing red by
   prescribing a worse implementation is theatre with the same colour scheme.

6. **One entry point for all 27 scenarios (`GreetingScreen.test.tsx`), no new component, slices
   01–03 red-first and 04–05 guards.** *(chosen)*

## Decision

| Slice | Kind | Seam (file · entry point) | Scenarios |
| --- | --- | --- | --- |
| 01 | red-first | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | 9 |
| 02 | red-first | same | 8 |
| 03 | red-first | same | 5 |
| 04 | **guard** | same | 3 |
| 05 | **guard** | same, plus `unmount()` → re-`render` (a fresh visit) | 2 |

Rules that go with it:

- A scenario is one `it(...)`, in one file; never split.
- `src/App.test.tsx` gains **no** `it`. It keeps exactly one, as ADR-0005 requires.
- The only non-DOM tests this feature adds are **three named assertions** in `src/visit.test.ts`
  (INV-10, INV-11, INV-12 — design §5.3), each guarding something no scenario can reach through the
  DOM. Nothing else; no spies, no snapshots, no `renderHook`.
- **Slices 04 and 05 are expected green on the first run.** That is the design's intent, not a
  missing test. Do not loosen anything to obtain a red bar; design §5.1 lists the specific wrong
  implementations each guard scenario kills.
- **Slice 04 must be built after slice 02**, even though issue 04 declares `Blocked by: 01`. Its
  step *"the only buttons inside the Saved name region are 'Save this name' and 'Greet me again'"*
  names a control that slice 02 introduces, so in a parallel lane run slice 04 would go red for a
  reason outside its own subject. The issue's acceptance criteria are **not** edited (out of this
  node's mandate); the constraint is declared in the design (§5), in this node's
  `slices[].blockedBy`, and for the human as **VH-03**.

## Consequences

**Positive**

- Every one of the 27 scenarios is driven through the project's **declared** seam, with the entry
  point named before a line is written; the developer never has to choose a file.
- No new test stack, no new dependency, no new component, no new production file — the feature is
  two files changed (`src/visit.ts`, `src/GreetingScreen.tsx`) plus two test files.
- `GreetingScreen` remains the single unit whose mount defines a fresh visit, so slice 05 needs no
  new mechanism (ADR-0019).

**Negative / accepted**

- **Two of five slices are guards.** That is a real cost — a red bar is the cheapest evidence a test
  can fail — and it is why they are labelled loudly here and in design §5.1, so nobody reads green
  as a broken workflow and nobody "fixes" it by weakening the design. It is the same trade this repo
  has now refused four times.
- **`GreetingScreen.test.tsx` grows past 27 new scenarios on top of its existing suite.** Accepted:
  they share one subject, and splitting by feature rather than by component would put two files in
  front of the same component, which is worse. The extraction tripwire above is the escape hatch.
- **No scenario in this feature exercises the app shell.** Accepted, because none of its acceptance
  criteria mention it and the existing `App.test.tsx` scenario still runs on every build.
- Slice 04's declared build-order dependency is stricter than its issue's. Accepted as the
  conservative direction: an unnecessary ordering costs a little parallelism, a missing one costs a
  red lane on a slice that is correct.

## Related

ADR-0005, ADR-0004, ADR-0007, ADR-0019, ADR-0023, `CLAUDE.md` (seam, commands, conventions),
design §5, §5.1–§5.4, `VERIFY-WITH-HUMAN.md` VH-03.
