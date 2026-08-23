# 07 — A fresh visit starts with nothing saved

Blocked by: 02-greet-again-as-any-saved-name, 03-remove-a-saved-name,
04-already-saved-is-refused, 05-full-list-is-refused, 06-name-field-hint-lists-every-saved-name.
This issue's scenarios need the saved names, both row controls, both refusal messages and the
hint to all already exist and be exercised, so that their absence after a fresh visit
demonstrates something rather than nothing. (01-hold-more-than-one-saved-name is presupposed
transitively by all five.)

Dir: src/

## Story

As a **visitor whose visit has ended**,
I want a fresh visit to start with an empty list of saved names,
so that I never see names, controls or messages left over from someone else's visit.

Deepens the "Arrive" backbone step on a second visit — exactly as `greet-visitor` issue 04 and
the single-slot `saved-name` issue 05 established for their own screens. In memory only (feature.md,
Decisions): the saved names die with the visit, like everything else on this screen.

Implementation note, carried from `greet-visitor` issue 04 and the single-slot `saved-name` issue
05: under the declared frontend seam (React Testing Library + user-event via Vitest/jsdom), jsdom
does not implement navigation or reload, so "starts a fresh visit" is driven by unmounting and
re-rendering the component from its initial state (a fresh mount), not by
`window.location.reload()`. Real browser reload-survival is out of scope for this jsdom suite.

No "no storage write" step is added to the scenarios below, for the same reason the earlier
fresh-visit issues dropped their own: it is the one part of this contract not observable through
the rendered DOM, contradicting this repo's "behaviour through the rendered DOM" convention. The
guarantee stands via feature.md's Out of scope, the existing `never writes to web storage`
constraint test, plus the scenarios below, which fail for any saved name, control or message that
survives a fresh mount.

## Acceptance criteria

```gherkin
Scenario: A fresh visit after saving several names starts clean
  Given the visitor saved "Ada", "Bob" and "Cleo" during a visit
  When the visitor starts a fresh visit
  Then the Saved names region reads "No names saved yet."
  And no button named "Save this name" is present
  And no button named "Greet me again as Ada" is present
  And no button named "Remove Ada" is present
  And the Name field has no description referring to saved names

Scenario: A fresh visit after removing a name starts clean too
  Given the visitor saved "Ada" and "Bob" and then removed "Ada" during that visit
  When the visitor starts a fresh visit
  Then the Saved names region reads "No names saved yet."
  And no row for "Bob" is present

Scenario: A fresh visit after a refused save starts clean too
  Given the visitor saved five names and then had a save refused with "Five names is the limit. Remove one to save another." during that visit
  When the visitor starts a fresh visit
  Then the Saved names region reads "No names saved yet."
  And no text "Five names is the limit. Remove one to save another." is present
```
