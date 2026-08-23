# 02 — The most recently saved name is marked

Blocked by: 01-every-saved-name-shows-when-it-was-saved (the marker is computed from the saved-at
moment issue 01 adds to every row; there is no "newest" to mark without it).

Dir: src/

## Story

As a **visitor with more than one saved name**,
I want the row I saved most recently to carry a marker I can see,
so that I can find it at a glance instead of comparing every row's age reading myself.

The marker needs nothing from sorting (issue 03) or the day-old cutoff (issue 04) to be correct —
it is a fact about which row has the latest saved-at moment, independent of how the rows are
displayed. It ships before sorting specifically so that issue 03's own scenario proving the marker
survives newest-first sorting has a marker already in place to check.

## Acceptance criteria

```gherkin
Scenario: The one saved name carries the marker
  Given the visitor has saved "Ada" only
  Then the row for "Ada" shows the label "Newest"

Scenario: Saving a second name moves the marker to it
  Given the visitor has saved "Ada" only, and the row for "Ada" shows the label "Newest"
  When the visitor saves "Bob"
  Then the row for "Bob" shows the label "Newest"
  And the row for "Ada" no longer shows the label "Newest"

Scenario: Exactly one row carries the marker at a time
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  Then exactly one row shows the label "Newest"
  And it is the row for "Cleo"

Scenario: Removing the newest saved name moves the marker to the next-newest
  Given the visitor has saved "Ada" and "Bob", in that order
  And the row for "Bob" shows the label "Newest"
  When the visitor activates "Remove Bob"
  Then the row for "Ada" shows the label "Newest"

Scenario: Re-saving an older name does not move the marker to it
  Given the visitor has saved "Ada" and "Bob", in that order
  And the row for "Bob" shows the label "Newest"
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Ada is already saved."
  And the row for "Bob" still shows the label "Newest"
  And the row for "Ada" does not show the label "Newest"

Scenario: No marker is shown when nothing is saved
  Given the visitor has not saved any name
  Then no text reading "Newest" is present
```
