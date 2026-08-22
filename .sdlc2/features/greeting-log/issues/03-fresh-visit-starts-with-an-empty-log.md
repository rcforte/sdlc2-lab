# 03 — A fresh visit starts with an empty log

Blocked by: 02-clear-the-greeting-log

Dir: src/

## Story

As a **visitor**,
I want a fresh visit to start with an empty greeting log,
so that nothing this feature added — an entry, a clear control — is still there when I arrive
again. (The Name field's own fresh-visit guarantee is a separate, already-shipped promise —
`greet-visitor` issue 04 — unchanged and untouched by this feature.)

This deepens the "Arrive at the greeting screen" backbone step on a second visit, exactly as
`greet-visitor`'s issue 04 did for the Name field, the greeting and the alert. It is Valuable in
its own right: a returning visitor must never see another visit's greeting log, whether or not
that visitor ever used issue 02's clear control — value-independence and build-order dependency
are separate questions.

Blocked by issue 02, not issue 01 alone: this issue's two scenarios need a prior greeting (issue
01) *and* a prior clear (issue 02) to already exist and be tested — the same rule `greet-visitor`'s
issue 04 uses ("Blocked by: 02-blank-name-alert", not 01, because its two scenarios need a prior
greeting *and* a prior alert). Every scenario a story carries must be exercisable once its
declared blocker has landed; blocking on 01 alone would leave this issue's second scenario
untestable until 02 happened to land too.

Guard-slice note for the developer node: the log's state must live in the same component-local,
unmount-discarded state as the rest of the visit — not a module-level variable or a write to
`localStorage`/`sessionStorage` that happens to satisfy issue 01's scenarios in isolation while
leaking across visits. See feature.md, Non-regression note, and the existing fresh-visit guard in
`src/GreetingScreen.test.tsx`.

## Acceptance criteria

```gherkin
Scenario: A fresh visit starts with an empty greeting log
  Given the visitor has already been greeted "Hello, Ada" and then "Hello, Grace" this visit
  When the visitor starts a fresh visit
  Then the greeting log is empty
  And the clear control is not present

Scenario: A fresh visit starts with an empty greeting log even after a clear in the previous visit
  Given the visitor has already been greeted "Hello, Ada" this visit
  And the visitor activated the clear control
  And the visitor was then greeted "Hello, Grace" this visit
  When the visitor starts a fresh visit
  Then the greeting log is empty
  And the clear control is not present
```
