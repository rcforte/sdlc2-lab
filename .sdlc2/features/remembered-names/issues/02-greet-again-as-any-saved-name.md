# 02 — Greet again as any saved name (walking skeleton, part 2 of 2)

Blocked by: 01-hold-more-than-one-saved-name — this issue's scenarios need a list holding more
than one name to already exist, so that "greet again as an earlier one, not just the most recent"
is demonstrable at all.

Dir: src/

## Story

As a **visitor with more than one saved name**,
I want a "Greet me again as `<name>`" control on every row,
so that I can be greeted as any name I saved, not only the last one, without retyping it.

This is the second half of the walking skeleton (see feature.md, Story map, and issue 01). Ships
together with issue 01: a list that can hold several names but offers no way back to an earlier
one only half-fixes the defect the seed names — a visitor who moves between two or three names
would still be back to retyping the ones they lost.

Per the seed's Decisions, row controls carry their own name — this is agreed to supersede the
single-slot feature's fixed-name-control rule, precisely because five buttons all announcing
"Greet me again" would be indistinguishable to anyone not looking at the screen.

## Acceptance criteria

```gherkin
Scenario: A row's greet-again control names the row's own name
  Given the visitor has saved "Ada" and "Bob", in that order
  Then a button named "Greet me again as Ada" is present
  And a button named "Greet me again as Bob" is present

Scenario: Greeting again as an earlier saved name works, not only the most recent
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor is currently greeted "Hello, Bob"
  When the visitor activates "Greet me again as Ada"
  Then the greeting reads "Hello, Ada"

Scenario: Greeting again is an ordinary greeting — it re-announces even when the name is unchanged
  Given the visitor has saved "Ada" and is currently greeted "Hello, Ada"
  When the visitor activates "Greet me again as Ada"
  Then the status region's content is replaced so the greeting announces again
  And the greeting still reads "Hello, Ada"

Scenario: Greeting again clears a standing blank-name alert
  Given the visitor has saved "Ada"
  And the visitor has just submitted a blank Name field, so an alert reads "Please enter your name."
  When the visitor activates "Greet me again as Ada"
  Then the greeting reads "Hello, Ada"
  And no alert is present

Scenario: Greeting again leaves the visitor's draft in the Name field untouched
  Given the visitor has saved "Ada"
  And the visitor has typed "Grace" into the Name field without submitting
  When the visitor activates "Greet me again as Ada"
  Then the greeting reads "Hello, Ada"
  And the Name field still contains "Grace"

Scenario: Greeting again does not change the saved names
  Given the visitor has saved "Ada" and "Bob", in that order
  When the visitor activates "Greet me again as Ada"
  Then the Saved names region still contains a row for "Ada" and a row for "Bob", in that order

Scenario: The greet-again control sits outside the form and does not submit it
  Given the visitor has saved "Ada"
  And the Name field now contains "Grace"
  When the visitor activates "Greet me again as Ada"
  Then the Name field still contains "Grace"
```
