# 03 — Sort the list newest-first

Blocked by: 01-every-saved-name-shows-when-it-was-saved (sorting needs a saved-at moment on every
row to sort by), 02-the-newest-saved-name-is-marked (this issue's own scenario proving the marker
survives newest-first sorting needs the marker to already exist).

Dir: src/

## Story

As a **visitor with more than one saved name**,
I want to switch the Saved names list to show the newest name first,
so that I can see my most recent saves without hunting for the marker among rows in save order.

Sorting is a view, not a reordering (seed, Agreed scope): the visit goes on holding names in the
order they were saved, and nothing that reads the list — saving, removing, greeting again, the
day-old cutoff, the Name field's hint — ever sees a sorted list. Oldest-first stays the default,
exactly as the list reads today.

## Acceptance criteria

```gherkin
Scenario: Oldest-first is the default, exactly as the list reads today
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  Then the Saved names region displays rows in the order "Ada", "Bob", "Cleo"
  And a checkbox named "Newest first" is present and unchecked

Scenario: Checking "Newest first" reorders the display
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  When the visitor checks "Newest first"
  Then the Saved names region displays rows in the order "Cleo", "Bob", "Ada"

Scenario: Unchecking "Newest first" returns to oldest-first
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor has checked "Newest first"
  When the visitor unchecks "Newest first"
  Then the Saved names region displays rows in the order "Ada", "Bob"

Scenario: Sorting is a view — the hint still lists names in save order, not display order
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  And the visitor has checked "Newest first"
  Then the Name field is described by text reading "Saved: Ada, Bob, Cleo"

Scenario: Removing a row while newest-first sorting is on removes the correct name and re-derives both views
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  And the visitor has checked "Newest first", so rows display "Cleo", "Bob", "Ada"
  When the visitor activates "Remove Bob"
  Then the Saved names region displays rows in the order "Cleo", "Ada"
  And the Name field is described by text reading "Saved: Ada, Cleo"

Scenario: A newly saved name appears first while newest-first sorting is on
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor has checked "Newest first"
  When the visitor saves "Cleo"
  Then the Saved names region displays rows in the order "Cleo", "Bob", "Ada"

Scenario: The newest marker is shown even though newest-first sorting already puts it on top
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor has checked "Newest first"
  Then the row for "Bob" shows the label "Newest"

Scenario: Re-saving an older name reorders nothing, under either view
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region displays rows in the order "Ada", "Bob"
  When the visitor checks "Newest first"
  Then the Saved names region displays rows in the order "Bob", "Ada"

Scenario: The sort control is absent while nothing is saved
  Given the visitor has not saved any name
  Then no checkbox named "Newest first" is present
```
