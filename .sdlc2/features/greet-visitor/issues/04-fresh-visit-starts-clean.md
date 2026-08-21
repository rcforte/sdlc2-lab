# 04 — A fresh visit starts clean

Blocked by: 02-blank-name-alert

Dir: src/

## Story

As a **visitor**,
I want a fresh visit to start from a clean screen,
so that nothing from a previous visit lingers when I arrive again.

This deepens the "Arrive at the greeting screen" backbone step on a second visit, and is
Valuable in its own right, independent of issue 03: a returning visitor must never see another
visit's name, greeting, or alert. It also constrains an implementation choice issue 01 alone
leaves open — whether the greeting/alert state lives in component-local React state (naturally
discarded when the component unmounts) or is lifted somewhere that survives a remount, such as a
module-level variable or an accidental write to `localStorage`/`sessionStorage`. Both of those
are plausible-but-wrong ways to satisfy issue 01's "Hello, <name>" scenarios in isolation. If
this issue's scenarios fail, the required fix is user-visible and testable: move the state into
the component so it resets on every fresh mount, or remove the storage write — not add bespoke
"reset" logic layered on top of state that should never have leaked.

Blocked by issue 02 (not 03): this issue's two scenarios need a prior greeting (which issue 01
introduces) and a prior alert (which issue 02 introduces) to already exist and be tested, but
need nothing from issue 03's recovery flow. Issues 03 and 04 are technical siblings — both
unblocked as soon as 02 lands — built in numeric order because that is the agreed release order
(see feature.md, Story map), not because 04 depends on 03's state.

Implementation note: "starts a fresh visit" is the Contract vocabulary term **Fresh visit**
(feature.md). Under the declared frontend seam (React Testing Library + user-event via
Vitest/jsdom), jsdom does not implement navigation or reload, so this step is driven by
unmounting and re-rendering the component from its initial state (a fresh mount), not by
`window.location.reload()`.

Real browser reload-survival is out of scope for this jsdom suite and is recorded for a human to
confirm at VERIFY time (see feature.md, `VERIFY-WITH-HUMAN.md` VH-02).

Constraint carried outside the scenarios — **no storage write.** An earlier round added a step
("no value was written to localStorage or sessionStorage during the visit") to each scenario
below. It has been removed: it was the only step in this contract not observable through the
rendered DOM, which contradicts this repo's convention (`CLAUDE.md`: tests assert "behaviour
through the rendered DOM — roles and accessible names, never implementation details"), and its
observation window ("the visit") was undefined. The guarantee stands via the seed's and the
contract's Out of scope, plus the two scenarios below, which fail for any stored state that is
ever read back. A write that is never read is invisible to the visitor and is a code-review
matter. See `VERIFY-WITH-HUMAN.md` **VH-06**.

Note on the status region: it is present in the DOM from the first render, so "the status region
is present and contains no text" is `expect(screen.getByRole('status')).toHaveTextContent('')` —
after a fresh visit the region is still there, just empty, exactly as on first arrival. See
feature.md, Contract vocabulary, and `VERIFY-WITH-HUMAN.md` VH-04.

## Acceptance criteria

```gherkin
Scenario: A fresh visit after a greeting starts from a clean screen
  Given the visitor typed "Ada" and was greeted "Hello, Ada"
  When the visitor starts a fresh visit
  Then the Name field is empty
  And the status region is present and contains no text

Scenario: A fresh visit after an alert starts from a clean screen
  Given the visitor submitted a blank Name field and sees the alert
  When the visitor starts a fresh visit
  Then the Name field is empty
  And no element with role "alert" is present
  And the status region is present and contains no text
```
