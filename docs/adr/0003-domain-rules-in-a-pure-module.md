# ADR-0003 — Domain rules live in a pure module beside the component, not inside it

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-15
- **Feature:** `greet-visitor` (`.sdlc2/features/greet-visitor/design.md` §3, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)

## Context

This repo's conventions (`CLAUDE.md`) describe *components* — one per file in `src/`, named export,
sibling `*.test.tsx` asserting behaviour through the rendered DOM. It says nothing about
non-component modules, because until now there were none. Adding `src/visit.ts` is
therefore a **new pattern for this codebase**, and it needs a reason beyond taste.

The rules at stake are small (blankness, trimming, greeting format, alert presence) but they are the
only part of this feature that is *not* about the DOM, and they are the part the design names as the
owner of six invariants (INV-1…INV-5b).

## Options considered

1. **Inline in `GreetingScreen.tsx`** — a `handleSubmit` that trims, tests for blank, and calls two
   `setState`s.
   *Rejected.* It is the cheapest thing that works today and the reason is honest — but it puts the
   invariants inside a click handler, where "who owns this rule" has no answer other than "whoever
   edits the component next". It also makes the rules reachable only through a render, so the
   inner TDD loop for a rule (e.g. tab-trimming) has to go through user-event and jsdom. The
   developer's friction is the design feedback: a rule that can only be tested by clicking is a
   rule with no home.

2. **A custom hook, `useVisit()`**, wrapping `useState` and exposing `{ greeting, alert,
   submit }`.
   *Rejected.* It keeps the rules coupled to React (they would then be testable only via
   `renderHook`, which this repo's convention explicitly discourages — tests assert the rendered
   DOM). It is also a layer whose entire content is one `useState` and one call; ADR-0004 keeps the
   `useState` in the component instead, which is one fewer indirection with identical behaviour.

3. **A `src/domain/` folder tree** (`domain/greeting/`, `application/`, `infrastructure/`).
   *Rejected.* Hexagonal folder ceremony for one pure function set and zero adapters. The repo is
   flat (`App.tsx`, `AppBanner.tsx`, `setupTests.ts`), and a three-level tree containing one file
   would advertise a structure the code does not have. Revisit if a second context ever appears.

4. **One flat, pure module beside the components: `src/visit.ts`.** *(chosen)*

## Decision

Domain rules live in `src/visit.ts`: a flat, side-effect-free module exporting
`ALERT_MESSAGE`, `Visit`, `newVisit`, `isBlank`, `submit`, `greetingText`, `alertText`.

Constraints on the module, which are what make it worth having:

- It imports **nothing** — no React, no DOM library, no storage, no `fetch`.
- It references **no ambient browser global** either — `localStorage`, `sessionStorage`, `fetch`,
  `document`, `window`, `globalThis`, `navigator`. This is a *separate* rule from the one above, and
  it must be, because `tsconfig.json` sets `"lib": ["ES2022", "DOM", "DOM.Iterable"]`: those names
  are ambient in every file in `src/`, so `localStorage.setItem(...)` compiles here with an empty
  import list. See ADR-0008 for how this half is actually checked (a lexical assertion in
  `src/visit.test.ts` plus a review checklist) — the import list does **not** check it.
- It declares **no module-level mutable binding** (`let`/`var`/mutable object). Only `const` values
  that are never reassigned. These three rules together are INV-6b ("the domain module holds nothing
  that could outlive a mount, and reaches nothing that could"), and they make INV-6a ("the visit's
  lifetime is the mount") achievable.
- It knows nothing about ARIA, roles, ids, class names, or element shape; the presentation
  invariants (P1–P3) are the component's.

**Where the line between "domain" and "presentation" actually falls — and why `ALERT_MESSAGE` is on
the domain side.** The purity rule above is about *element shape*, not about English. This module
deliberately owns the two pieces of visitor-facing **message text** in the feature:

| String | Owner | Why |
| --- | --- | --- |
| `'Hello, '` prefix (inside `greetingText`) | `src/visit.ts` | The seed defines **Greeting** as "the rendered `Hello, <name>` message" — the message *is* the rule's output, so `greetingText` returning `'Hello, Ada'` and returning `''` are the same decision. Splitting the prefix out would leave `greetingText` returning a name and the component re-deriving the greeting: two owners for INV-3. |
| `ALERT_MESSAGE` | `src/visit.ts` | Same reason, one level down: `alertText` returns *the message or `null`*, and the `null` is what P2 keys the element's presence off. A "nullable marker the component maps to copy" (the rejected alternative) would give the alert two owners — the domain deciding *whether*, the component deciding *what* — for no gain, since the copy is a fixed English constant with no locale switch (ADR-0006 rejects an i18n port). |

The consequence is stated so it cannot surprise anyone: **VH-03's unconfirmed alert copy has exactly
one production edit site — `ALERT_MESSAGE` in `src/visit.ts`** (plus the literal in each test that
asserts it). By contrast the submit control's accessible name `'Greet me'` — also VH-03, also
unconfirmed — is *not* a message but an element's label, so it stays in `GreetingScreen.tsx`, one
JSX node. Neither string is duplicated anywhere.

What the module still may not contain: an id, a role, a class name, an `aria-*` attribute name, or
any string whose meaning is "where this goes on screen" rather than "what this says".

Naming follows the existing house style: components PascalCase (`AppBanner.tsx`), non-components
camelCase (`setupTests.ts` → `visit.ts`).

**Testing:** the module is exercised through the DOM acceptance tests, which remain the
specification per `CLAUDE.md`. A sibling `src/visit.test.ts` is *permitted* as an inner
TDD cycle (it is not a component, so the "every component has a sibling test" rule does not compel
one), but it must never become the only place a *behavioural* rule is asserted — every rule in this
feature also shows up in a scenario. The one exception, deliberate and argued in ADR-0008: the INV-6b
purity assertion lives only there, because it asserts a structural property no scenario can observe.

## Consequences

**Positive**

- Each invariant has a named owner that a reader can open: INV-1 is `isBlank`, INV-3 is
  `greetingText`, and so on.
- The rules are testable in microseconds without jsdom, so the developer's inner loop is fast while
  the outer loop stays DOM-driven.
- The component shrinks to transport: read state, call `submit`, render two projections.

**Negative / accepted**

- One new file and a new file *category* in a repo that had only components. Accepted because the
  category is justified by ownership, not by symmetry — and it is explicitly noted here so the next
  reader knows it was a decision, not drift.
- Slight risk of the module accreting UI concerns (an id, a class name) or, worse, an I/O call. The
  "imports nothing" rule catches only what needs an import — **it does not catch `localStorage`,
  `fetch` or `document`, which are ambient here** (see the constraint list above and ADR-0008). The
  actual guard is ADR-0008's lexical assertion in `src/visit.test.ts`, which runs in the normal test
  command; ids and class names remain a review matter.
- Two files must be opened to follow a submission end to end. At this size, acceptable.
- Product copy (`ALERT_MESSAGE`, the `'Hello, '` prefix) lives in a module labelled "domain", so a
  copy change edits the domain module. Accepted deliberately, with the reasoning in the table above;
  the mitigation is that the edit site is single and named, so VH-03 resolving one way or the other
  is a one-line change with no structural consequence.

## Related

ADR-0001 (what the module contains), ADR-0004 (where the state instance lives), ADR-0005 (the test
seam), ADR-0008 (how the purity constraints above are actually enforced — it corrects this ADR's
original claim that the import list was sufficient), `CLAUDE.md` (repo conventions this ADR extends).
