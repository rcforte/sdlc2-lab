# 05 — A fresh visit starts with nothing saved

Blocked by: 02-greet-again-as-the-saved-name and 03-be-reminded-of-the-saved-name — this issue's
scenarios need the saved name, the greet-again control, and the hint to all already exist and be
tested, so their absence after a fresh visit demonstrates something. Not blocked by
04-replace-the-saved-name — its replace behaviour is not exercised by these scenarios; 04 and 05
are siblings, both unblocked once 02 and 03 land, built in numeric order because that is the
agreed release order (see feature.md, Story map), not because 05 needs 04's state. This mirrors
`greet-visitor` issue 04's own "siblings, built in numeric order" reasoning.

Dir: src/

## Story

As a **visitor**,
I want a fresh visit to start with nothing saved,
so that I never see another visit's saved name, hint, or greet-again control.

This deepens the "Arrive" backbone step on a second visit — exactly as `greet-visitor` issue 04
established for the greeting and the alert. In memory only (feature.md, Decisions): the saved
name dies with the visit, like everything else on this screen.

Implementation note, carried from `greet-visitor` issue 04: under the declared frontend seam
(React Testing Library + user-event via Vitest/jsdom), jsdom does not implement navigation or
reload, so "starts a fresh visit" is driven by unmounting and re-rendering the component from its
initial state (a fresh mount), not by `window.location.reload()`. Real browser reload-survival is
out of scope for this jsdom suite.

No "no storage write" step is added to the scenarios below, for the same reason `greet-visitor`
issue 04 dropped its own: it is the one step in this contract not observable through the rendered
DOM, contradicting this repo's "behaviour through the rendered DOM" convention. The guarantee
stands via feature.md's Out of scope and the existing `never writes to web storage` constraint
test, plus the scenarios below, which fail for any saved name that survives a fresh mount.

## Acceptance criteria

```gherkin
Scenario: A fresh visit after saving starts clean
  Given the visitor saved "Ada" during a visit
  When the visitor starts a fresh visit
  Then the Saved name region reads "No name saved yet."
  And no button named "Save this name" is present
  And no button named "Greet me again" is present
  And the Name field has no accessible description

Scenario: A fresh visit after greeting again starts clean too
  Given the visitor saved "Ada" and activated "Greet me again" during a visit
  When the visitor starts a fresh visit
  Then the Saved name region reads "No name saved yet."
  And the status region is present and contains no text
  And no button named "Greet me again" is present
```
