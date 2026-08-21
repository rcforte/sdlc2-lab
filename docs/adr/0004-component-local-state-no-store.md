# ADR-0004 — The visit lives in component-local `useState`; no store, no persistence

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-15
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` §2.4 INV-6a/INV-6b, §5)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)

## Context

Story 4 requires a fresh visit to start clean, and the issue file names the failure modes it exists
to catch: state lifted to a module-level variable, or written to `localStorage`/`sessionStorage` —
both of which satisfy Stories 1–3 in isolation and betray the seed's *"the name is not persisted
anywhere"*. Where the aggregate instance lives is therefore a **behavioural** decision here, not an
implementation detail, and it decides whether Story 4 passes by construction or by bolted-on reset
logic.

`VERIFY-WITH-HUMAN.md` VH-06 removed the "no storage write" assertion from the Gherkin (it was not
DOM-observable), which shifts weight onto this structural choice: nothing in the *acceptance* suite
will catch a write that is never read, so the design must make such a write have nowhere natural to
go — and must be honest about the part it cannot make impossible (ADR-0008).

## Options considered

1. **Module-level `let visit` in `visit.ts`** (a singleton).
   *Rejected.* It survives unmount, so Story 4 fails; "fixing" it would mean adding explicit reset
   logic on mount — state that should never have leaked, plus code to un-leak it. It also makes
   tests order-dependent, since Vitest shares a module registry within a file.

2. **React Context / a provider above `GreetingScreen`.**
   *Rejected.* Context solves *distribution* of state to distant consumers; there is exactly one
   consumer. It also moves the state's lifetime up to the provider, so "a fresh visit" would depend
   on which component the test remounts — an ambiguity the seam definition (VH-02) explicitly
   removes by pinning it to `GreetingScreen`.

3. **A store library (Redux Toolkit / Zustand / Jotai).**
   *Rejected.* A runtime dependency for two fields, with module-scoped store lifetime that
   reintroduces option 1's leak unless configured against it. `CLAUDE.md` deliberately keeps this
   repo minimal; nothing here needs cross-tree sharing, middleware, or devtools.

4. **`useReducer` in the component** instead of `useState`.
   *Rejected — narrowly.* It is a reasonable alternative and behaviourally identical (the reducer
   would just be `submit`). It loses to `useState` only because the transition already lives in the
   domain module: a reducer would add an action-type indirection (`{ type: 'SUBMIT', rawName }`)
   between the click and the function it already calls directly. Worth revisiting if a second
   command ever appears.

5. **`sessionStorage`/`localStorage` for convenience** ("so a refresh keeps the greeting").
   *Rejected.* Directly forbidden by the seed's Out of scope, and it is the exact behaviour Story 4
   is written to catch. If the greeting ever should survive a reload, the seed says that is a
   separate capability and a separate feature.

6. **Two `useState` hooks inside `GreetingScreen`: `rawName` and `visit`.** *(chosen)*

## Decision

`GreetingScreen` holds:

```ts
const [rawName, setRawName] = useState('')             // the field's own value (INV-7), lifetime INV-6c
const [visit, setVisit] = useState<Visit>(newVisit)     // the aggregate (INV-6a)
```

and submits with `setVisit(current => submit(current, rawName))`. Nothing else in the app holds
greeting state: no module-level mutable binding, no context, no store, no web storage, no `ref`.

**Both hooks are covered by this decision, and R7 needs both.** Story 4 asserts three things about a
fresh visit — no name, no greeting, no alert. The second and third are properties of `visit`
(INV-6a); the first is a property of `rawName` (**INV-6c**), and it fails independently: a
module-level `let rawName`, a hoisted `defaultValue`, or an uncontrolled input satisfies INV-6a and
INV-7 and still shows the previous visitor's text after a remount. Neither hook may be hoisted.

Consequently a **fresh visit** is precisely a fresh mount of `GreetingScreen` — which is exactly how
the acceptance tests drive it (VH-02) — and no reset code exists or is needed.

The field's raw value is kept as separate state from the aggregate on purpose: it is transport
state (what is currently typed), not domain state (what was submitted). Merging them would let a
keystroke reach the aggregate and would put INV-7 and INV-5a in tension.

## Consequences

**Positive**

- Story 4 passes by construction; both of its scenarios are *guards* against a future leak rather
  than drivers of new code. Design §5.1 labels slice 04 a **guard slice** for exactly this reason,
  so the developer is not sent looking for a red bar that this ADR has already made unobtainable.
  (The alternative — leaving the state's location undecided until slice 04 forces it — was rejected
  in the options above: it would buy one red test by shipping slices 01–03 with a known leak.)
- Test isolation is free: each `render` starts a genuinely new visit, so no `beforeEach` reset,
  no `vi.resetModules()`.
- Zero new dependencies; `npm run build` and `npm test -- --run` are unchanged.

**Negative / accepted**

- The greeting is lost on a real page reload. That is the specified behaviour, not a regression —
  and the real-browser confirmation is the human check recorded in VH-02.
- If a sibling component ever needs to read the greeting, this choice must be revisited (lift the
  state to `App`, or introduce context then — not now).
- A never-read storage write would still pass the suite (VH-06). **This ADR previously claimed a
  structural mitigation — "the domain module imports nothing, so such a write could only appear in
  the component" — and that was wrong**: `tsconfig.json` puts `DOM` in `lib`, so `localStorage` needs
  no import anywhere in `src/`, domain module included. What actually stands here is ADR-0008: a
  lexical purity assertion covering `src/visit.ts` mechanically, plus a two-line greppable review
  checklist for `GreetingScreen.tsx`, which nothing mechanical covers. The component half is a
  residual risk carried by review, not a guarantee.

## Related

ADR-0001, ADR-0003, ADR-0007 (the same "don't ship a defect to buy a red bar" trade, applied to
slice 03), ADR-0008 (what actually guards the no-storage rule), VH-02 (fresh visit is a remount),
VH-06 (storage assertion dropped), `issues/04-fresh-visit-starts-clean.md`.
