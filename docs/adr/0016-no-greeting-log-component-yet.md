# ADR-0016 — No `GreetingLog` component yet: the region stays inside `GreetingScreen`, with a named tripwire

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` §3, §7)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0003 (what earns a new module), ADR-0005/ADR-0015 (the seam), ADR-0014 (the
  focus rule that would be split by a premature extraction)

## Context

`CLAUDE.md` fixes the repo's convention: *"Components are function components in `src/`, one file
each, named export"* and *"Every component has a sibling `*.test.tsx` asserting behaviour through the
rendered DOM… No component ships without one."* This feature adds a visibly separable piece of
screen — a labelled region with a heading, two mutually exclusive shapes and its own control — which
reads like a component asking to be born. `GreetingScreen.tsx` will grow from ~70 to ~110 lines.

The convention cuts both ways: extracting a component **obliges** a sibling test, and that test would
have nothing to assert that `GreetingScreen.test.tsx` does not already assert better — through the
seam, with the real state behind it.

## Options considered

1. **Extract `GreetingLog.tsx` now**, taking `entries`, `onClear`, and a forwarded `ref` for the
   focus move.
   *Rejected for now.* It creates a three-member props surface for one caller, and it splits
   ADR-0014's focus rule across two files: the handler that clears would live in the parent, the
   element that receives focus in the child, and the ref between them. That is a wider interface than
   the work behind it — the exact anti-pattern the deepening pass hunts. It also obliges a sibling
   test that either duplicates the acceptance scenarios against fabricated props, or asserts
   implementation details; both are worse than the tests we already have.
2. **Extract a presentational `<GreetingLogEntries entries={…}/>` only** (the `<ol>`).
   *Rejected.* It splits the two mutually exclusive shapes (P7) across two files, so the rule "empty
   message **or** list, never both" would no longer be visible in one expression. Splitting
   presentation from presentation is the split ADR-0003's Consequences already warned against.
3. **Extract a headless `useGreetingLog()` hook.**
   *Rejected.* The rules are already out of the component and in `src/visit.ts`; a hook would wrap
   `useState` + two calls and add a layer with one inhabitant (ADR-0003 rejected `useVisit` for the
   same reason).
4. **Keep the region inside `GreetingScreen`, and name the condition that would change it.**

## Decision

Option 4. The log region, its two shapes, its entries and its clear control are rendered by
`GreetingScreen.tsx`. No new file in `src/` this feature; no new sibling test file; the convention is
satisfied because the component that exists still has its sibling test.

**Tripwire for revisiting** (also in the design's deepening pass): extract when there is a **second
consumer or a second reason to change** — per-entry controls (ADR-0012's trigger), a second log-like
region, or `GreetingScreen.tsx` passing ~150 lines. When that day comes, extract the **whole region
including its clear control and its ref**, not a presentational `<ol>` wrapper, so ADR-0014's focus
rule stays in one file.

## Consequences

**Good.**
- One component, one state owner, one focus rule, one place where the two shapes are chosen — all
  visible in a single render function a reviewer can read top to bottom.
- No new test file whose only content would be a weaker restatement of the acceptance scenarios.
- The extraction stays cheap later precisely because the domain rules are already outside the
  component: what would move is markup and one ref.

**Bad / accepted.**
- `GreetingScreen.tsx` reaches ~110 lines and four regions. It is the largest file in `src/` and will
  keep growing if this screen keeps growing; the tripwire is the mitigation, and it is a count plus a
  reason rather than taste.
- A reader coming from the convention alone ("one component per file") may read the absence of
  `GreetingLog.tsx` as an oversight. This record is the answer.

## What would change this

Any of the three tripwire conditions above. Note that the first of them (per-entry controls) also
triggers ADR-0012's entry-identity change — they would land together, which is a further reason not
to pre-empt either.
