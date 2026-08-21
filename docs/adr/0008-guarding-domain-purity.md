# ADR-0008 — Guarding INV-6b: a lexical purity assertion plus a named review checklist, because "imports nothing" guards nothing

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-16
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` §2.4 INV-6b, §5.3, §6)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Corrects:** ADR-0003 (Consequences), ADR-0004 (Consequences), ADR-0006 (Consequences) — each of
  which claimed the import rule made the no-storage guarantee structural. It does not.

## Context

The seed's Out of scope is flat: *"No backend, no localStorage, no analytics."* VH-06 then removed
the only acceptance step that could observe a storage write (it was not DOM-observable, contradicting
`CLAUDE.md`), on the reasoning that a write which is *read back* is caught by Story 4's remount
scenarios, and a write that is never read is "caught by code review".

Earlier rounds of this design claimed a structural mitigation for that residual: `src/visit.ts`
**imports nothing**, so a storage write "would have to appear in the component, where a reviewer will
see it" (ADR-0004), and "a violation is visible in one line of the import list" (ADR-0003).

**That inference is invalid for this toolchain.** `tsconfig.json` declares:

```json
"lib": ["ES2022", "DOM", "DOM.Iterable"]
```

so `localStorage`, `sessionStorage`, `indexedDB`, `fetch`, `XMLHttpRequest`, `document`, `window` and
`navigator` are **ambient globals in every file in `src/`**, domain module included. Concretely, this
line inside `submit`:

```ts
localStorage.setItem('name', rawName.trim())
```

typechecks under `strict` + `tsc -b`, runs, and adds **nothing** to the import list. The failure mode
is fully closed: VH-06 deleted the only step that could observe it; all sixteen scenarios stay green
(nothing reads the value back, so a fresh mount still renders `newVisit`); and a reviewer applying
the guard the ADRs named — *read the import list* — sees a clean file and approves. The seed-level
rule would then rest on nothing at all.

An inoperative guard is worse than a named residual risk, because it stops anyone looking.

## Options considered

1. **Status quo: rely on the "imports nothing" rule.**
   *Rejected.* Demonstrated above to be inoperative for exactly the class of write it claims to
   catch. Keeping it would mean carrying a false "structural mitigation" into the human VERIFY gate,
   where it would be read as a guarantee.

2. **Restate INV-6b honestly and add no mechanism** — say plainly that the ambient-globals half is a
   review check, and stop there.
   *Rejected — but only just.* Honesty is the necessary half of the fix, and this option delivers it.
   What it does not deliver is any cost to violating the rule: review is the same reviewer, with the
   same file, and now without even a rule of thumb to apply. Since option 5 costs one test and no
   dependency, "honest and unguarded" is not the best available trade. (Option 5 includes this
   option's restatement in full.)

3. **Spy on `Storage.prototype.setItem` in the acceptance tests** (VH-06's option 1, rehabilitated).
   *Rejected.* VH-06 decided against it after considering it, and this ADR does not get to relitigate
   a `VERIFY-WITH-HUMAN` record. It also contradicts `CLAUDE.md`'s DOM-only rule for behaviour tests,
   and its observation window was never definable ("during the visit"). If a human ever reverses
   VH-06, the wording is ready to paste in there — that is the right place for it, not here.

4. **ESLint with `no-restricted-globals` / `no-restricted-properties` scoped to `src/visit.ts`.**
   *Rejected.* This repo has no linter at all: no `eslint` in `devDependencies`, no `lint` script, no
   config file. Adding one means a dev dependency, a config, and a new command that `CLAUDE.md`'s
   sdlc2 block does not declare (it declares `test` and `build` only) — so it would not run in the
   graph anyway without editing that block. Design constraint N6 rules out new stack for this lab
   repo. **This is the right answer the day the repo adopts a linter for other reasons**, and design
   §7 says so.

5. **A lexical purity assertion in `src/visit.test.ts` (plus a four-line `src/rawModules.d.ts` so the
   module can be read as text), plus a two-line review checklist for the one file the assertion
   cannot cover.** *(chosen)*

6. **A DOM-free TypeScript project for the domain**: a second `tsconfig.domain.json` including only
   `src/visit.ts` with `"lib": ["ES2022"]`, referenced from a solution-style root config, so
   `localStorage` fails to *compile* in the domain module.
   *Rejected for now, and it is the strongest rejected option — it is the only genuinely structural
   one.* It costs: `"composite": true`, project references, a second config file, and a change to how
   `tsc -b` is invoked — i.e. it restructures the build command `CLAUDE.md` declares, for one
   five-function file in a lab repo whose stated purpose is exercising the graph rather than the
   stack. It also covers strictly less than option 5 in one respect (it says nothing about
   module-level `let`, which is INV-6b's other half) while covering more in another (it is
   unevadable). Recorded as the escalation path in design §7: if the build ever grows project
   references for another reason, take this and delete the regex.

## Decision

INV-6b is restated as **two conditions with two different enforcement mechanisms, and the difference
is stated wherever the invariant is mentioned**:

| Half | Condition on `src/visit.ts` | Enforced by |
| --- | --- | --- |
| (a) | No import at all; no module-level mutable binding (`let`/`var`/mutable object) | Visible in the file's first lines — genuinely self-evident on reading, *and* asserted by the guard test below |
| (b) | No reference to an ambient browser global: `localStorage`, `sessionStorage`, `indexedDB`, `fetch`, `XMLHttpRequest`, `document`, `window`, `globalThis`, `navigator` (plus `Date`, `Math.random` for determinism) | **The guard test below. Not structural — `DOM` is in `lib`.** |

The guard test lands with `src/visit.ts` in slice 01 (design §5.3), as two files:

```ts
// src/rawModules.d.ts
declare module '*?raw' {
  const source: string
  export default source
}
```

```ts
// src/visit.test.ts
import visitSource from './visit.ts?raw'

const source = visitSource
  .replace(/\/\*[\s\S]*?\*\//g, '')  // strip block comments
  .replace(/\/\/.*$/gm, '')          // strip line comments

it('stays pure: no imports, no top-level mutable state, no ambient browser globals (INV-6b)', () => {
  expect(source).not.toMatch(/^\s*import\s/m)
  expect(source).not.toMatch(/^(let|var)\s/m)   // column 0 ⇒ module level; locals inside functions are fine
  expect(source).not.toMatch(
    /\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|document|window|globalThis|navigator|Date|Math\.random)\b/,
  )
})
```

Two toolchain facts behind that shape, both checked against the installed packages rather than
assumed (a scratch module reproducing each was compiled and run, then deleted):

- **`node:fs` is not available.** `@types/node` is not in `devDependencies` and not in
  `node_modules/@types/`, so `import { readFileSync } from 'node:fs'` fails `tsc -b` and breaks
  `npm run build`. Vite's `?raw` query needs no package at all.
- **The ambient declaration is needed** because `tsconfig.json` pins `"types": ["vitest/globals",
  "@testing-library/jest-dom"]`, which excludes `vite/client` (where `declare module '*?raw'` lives).
  Adding `"vite/client"` to that array is an equally valid alternative; the four-line `.d.ts` was
  chosen to keep the change inside `src/` and out of the build configuration.

The same scratch run confirmed the premise of this ADR from the other side: a probe module containing
`localStorage.setItem('name', rawName.trim())` **and no imports** compiled cleanly under `tsc -b`
(exit 0) and was caught only by the assertion above.

And the review checklist, which is what covers `GreetingScreen.tsx` — the file no mechanism here can
cover, because it legitimately uses React and the DOM. **Two lines, to be checked at code review and
at the human VERIFY gate:**

1. `GreetingScreen.tsx` contains no `localStorage`, `sessionStorage`, `indexedDB`, `fetch`,
   `XMLHttpRequest`, `navigator.sendBeacon`, or any other call that leaves the page. (`grep -nE
   'localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|sendBeacon' src/*.tsx` should print
   nothing.)
2. `GreetingScreen.tsx` holds no state outside the component body: no module-level `let`, no
   module-level object mutated by a handler, no `ref` used as a store, no context provider added
   above it (ADR-0004).

Why the checklist is written as two greppable lines rather than a principle: a reviewer given "check
for purity" checks nothing; a reviewer given a command runs it.

## Consequences

**Positive**

- The claim now matches the mechanism. Nobody arrives at VERIFY believing the no-storage rule is
  structurally guaranteed when it is not.
- The realistic failure — a developer reaching for `localStorage` out of habit or "for convenience"
  mid-slice — is caught by `npm test -- --run`, in the same run as everything else, with no new
  dependency and no change to the declared commands.
- INV-6b's half (a) gains a mechanical check too, which it previously did not have: a module-level
  `let` sneaking in is caught by the same assertion.
- The escalation path is named (option 6, or option 4 if a linter arrives), so the next author does
  not have to redo this analysis.

**Negative / accepted**

- **The assertion is lexical, so it is evadable.** `globalThis['local' + 'Storage']` defeats it —
  which is why `globalThis` is itself in the pattern, raising the price of evasion to something no
  one does by accident. This guard is aimed at accident and drift, not at a determined author. Stated
  plainly so it is not over-trusted the way the import rule was.
- **`GreetingScreen.tsx` remains unguarded mechanically.** A never-read storage write there passes
  the whole suite. That is the residual risk VH-06 knowingly accepted; this ADR narrows it from "the
  whole feature" to "one component file", and hands review a grep instead of a principle. Design §6
  records it as a residual risk, not a guarantee.
- **A non-DOM, source-reading test in a repo whose convention is DOM-behaviour tests.** Justified,
  not incidental: `CLAUDE.md`'s rule governs *components* ("every component has a sibling
  `*.test.tsx`… behaviour through the rendered DOM"), `visit.ts` is not a component, and ADR-0003
  already permits `src/visit.test.ts` as an inner cycle. It is also not a behaviour test at all — it
  asserts a structural property that no behaviour test can reach, which is exactly why it exists. It
  does not reopen VH-06: no spy, no acceptance step, no scenario changed.
- **One extra file of pure scaffolding** (`src/rawModules.d.ts`, four lines) in a repo that had no
  `.d.ts` files. Accepted: it is smaller than any alternative that achieves the same, adds no
  dependency, and is named in design §5.3 so it is not read as drift.
- **The regex will need maintenance** if the module ever legitimately needs one of those names.
  Design §7 makes that a trigger to reopen this ADR rather than to widen the pattern quietly.

## Related

ADR-0003 (the pure-module rule; its "visible in the import list" consequence is corrected by this
ADR), ADR-0004 (state lifetime; its "structural mitigation" wording is corrected), ADR-0006 (no
driven ports; same correction), VH-06 (the dropped storage assertion — honoured, not relitigated),
`CLAUDE.md` (conventions and declared commands), design §2.4 INV-6b, §5.3, §6, §7.
