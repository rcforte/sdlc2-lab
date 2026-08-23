# ADR-0033 — One acceptance seam for all seven slices (`GreetingScreen.test.tsx`); no `App` scenario, no new component; 01–03 red-first, 04–07 guards; the queue stays in `issues/`

- **Status:** Proposed — accepted pending the human VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `remembered-names` (`.sdlc2/features/remembered-names/design.md` §5, §5.1–§5.5)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0005 (the two entry points and the duplication tripwire), ADR-0007
  (invariants arrive whole; guard slices), ADR-0025 (the same three questions, answered for the
  single-slot feature, and its own superseded queue edge), ADR-0016 (no log component yet),
  SD-07 (a design node must not declare a queue edge)

## Context

Seven slices, 40 scenarios, one declared seam:

```yaml
seam:     { backend: "", frontend: "React Testing Library + user-event via Vitest (jsdom)" }
commands: { test: "npm test -- --run", build: "npm run build", install: "npm ci" }
```

Four questions have to be answered before a line is written, and three of them have a wrong answer
that looks reasonable:

1. **Which entry point?** `greet-visitor` established two — `render(<App />)` for its one
   composition scenario, `render(<GreetingScreen />)` for everything else — plus a tripwire: a
   second `it` in `App.test.tsx` means the suite has begun to duplicate itself.
2. **Does the Saved names region finally become its own component?** It has grown from ~10 to ~35
   lines of JSX and now contains a repeated sub-shape (the row).
3. **Which slices can honestly go red first?** ADR-0007's rule — *absent concept, yes; half-written
   rule, no* — decides it, and this time the answer is only three of seven.
4. **How is the slice order expressed?** ADR-0025 answered this wrongly once: it declared a
   build-order edge that `issues/` did not carry, the run refuted it (VH-03), and SD-07 was written
   because two artifacts of one run asserting different graphs is a hazard in itself.

## Options considered

1. **Add a walking-skeleton scenario at the `App` seam.**
   *Rejected.* No acceptance criterion here mentions the app shell; the composition is already
   pinned by the existing `App.test.tsx` scenario; this feature adds no component to wire. It would
   trip ADR-0005's duplication tripwire on purpose.
2. **Extract `SavedNamesRegion` (and perhaps `SavedNameRow`) with sibling test files.**
   *Rejected — again, and with the tripwire restated rather than merely re-quoted.* ADR-0025's
   condition was *a second screen needs it, or the screen acquires a third piece of state no other
   part reads*. Neither happened: there is still one screen, and the new `useRef` is a handle on a
   node this component already renders, not state. An extracted region would own no rule, would take
   `visit` plus three callbacks, and — under `CLAUDE.md`'s sibling-test rule — would either
   duplicate these scenarios in a second file or ship an untested component. A `SavedNameRow` would
   be worse: a component whose entire body is a name and two buttons, with a test file asserting
   what six acceptance scenarios already assert. **Restated tripwire:** extract when the region
   needs state of its own, or when a second screen renders it.
3. **Drive the rules directly** (`renderHook`, or treating `visit.ts` as the acceptance seam).
   *Rejected as the outer seam.* The repo convention is behaviour through the rendered DOM, and a
   suite that stays green while a row's buttons are unlabelled is worthless. Inner-cycle module
   tests remain permitted and are named exhaustively (design §5.3: four assertions, no more).
4. **A browser E2E runner** for the live-region, focus-announcement and reload questions.
   *Rejected.* `CLAUDE.md` rules Playwright and Cucumber deliberately out, and all three questions
   are already routed to human checks (VH-04 here; `greet-visitor` VH-02 for reload).
5. **Make 04, 05 and 06 red-first** by deferring the duplicate rule, the limit, and the hint's join
   to their own slices.
   *Rejected.* All three are ADR-0007's forbidden move — a live concept with a branch left wrong —
   and each has a named visitor-visible defect: two identical rows with two identical pairs of
   controls; a list of six in a feature whose premise is five; a hint that lies about a list the
   visitor can see next to it. Manufacturing red by prescribing a worse implementation is theatre
   with the same colour scheme.
6. **Declare in this ADR the extra dependency that issue 06's third scenario needs.**
   *Rejected outright, and this is the lesson of VH-03 and SD-07.* `issues/` is what the build
   engine reads. A design that declares an edge `issues/` does not carry produces two graphs, only
   one of them executable, and sends the human a question about an edge the build already ignored.
   The disagreement is filed as a **defect against the `po` node** instead — `disputed`, plus
   `VERIFY-WITH-HUMAN.md` **VH-01**, naming the issue file to amend.
7. **One entry point for all 40 scenarios (`GreetingScreen.test.tsx`), no new component, 01–03
   red-first, 04–07 guards, the queue left entirely in `issues/`.** *(chosen)*

## Decision

| Slice | Kind | Seam (file · entry point) | Scenarios |
| --- | --- | --- | --- |
| 01 | red-first | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | 8 |
| 02 | red-first | same | 7 |
| 03 | red-first | same | 7 |
| 04 | **guard** | same | 5 |
| 05 | **guard** | same | 5 |
| 06 | **guard** | same | 5 |
| 07 | **guard** | same, plus `unmount()` → re-`render` (a fresh visit) | 3 |

Rules that go with it:

- A scenario is one `it(...)`, in one file; never split.
- `src/App.test.tsx` gains **no** `it`.
- The only non-DOM tests this feature adds are **four named assertions** in `src/visit.test.ts`
  (INV-18, INV-19, INV-21, INV-22 — design §5.3), each guarding something no scenario can reach
  through the DOM. Nothing else; no spies, no snapshots, no `renderHook`.
- **Slices 04, 05, 06 and 07 are expected green on the first run.** That is the design's intent, not
  a missing test. Do not loosen anything to obtain a red bar; design §5.1 lists the specific wrong
  implementations each guard scenario kills.
- This feature **retires** merged behaviour (replacing, the fixed-name greet-again control, the
  singular copy, `savedNameRegionText`). Design §4.3 is the per-slice list of merged tests to delete
  or rewrite, and of the merged tests that must survive untouched.
- **The slice queue is stated only in `issues/`.** This ADR and `design.md` declare no `Blocked by:`
  edge and contradict none.

## Consequences

**Positive**

- All 40 scenarios go through the project's **declared** seam, with the entry point and the queries
  named before a line is written; the developer never has to choose a file or invent a query.
- No new test stack, no new dependency, no new component, no new production file — the feature is
  two files changed (`src/visit.ts`, `src/GreetingScreen.tsx`) plus two test files.
- `GreetingScreen` remains the single unit whose mount defines a fresh visit, so issue 07 needs no
  new mechanism (ADR-0026).
- The queue hazard is raised where it can actually be fixed — in the issue file — instead of being
  patched downstream where the build cannot see it.

**Negative / accepted**

- **Four of seven slices are guards.** A red bar is the cheapest evidence a test can fail, and this
  feature forgoes it four times. It is labelled loudly here and in design §5.1, with the wrong
  implementation each guard kills named, so nobody reads green as a broken workflow and nobody
  "fixes" it by weakening the design.
- **`GreetingScreen.test.tsx` reaches roughly 80 scenarios** (40 new, ~13 merged ones retired).
  Accepted: they share one subject, and splitting by feature rather than by component would put two
  test files in front of one component, which is worse. The extraction tripwire above is the escape
  hatch.
- **One slice's scenarios cannot pass on the branch its own issue implies** (design §5.5). Accepted
  as a defect to be fixed upstream rather than routed around here; if the `po` does not amend it,
  the lane fails loudly and visibly, which is a better outcome than a design that quietly disagreed
  with the executable graph.
- No scenario in this feature exercises the app shell. Accepted: none of its acceptance criteria
  mention it, and the existing `App.test.tsx` scenario still runs on every build.

## Related

ADR-0005, ADR-0007, ADR-0016, ADR-0025, ADR-0026, ADR-0030, `CLAUDE.md` (seam, commands,
conventions), design §5, §5.1–§5.5, `VERIFY-WITH-HUMAN.md` VH-01.
