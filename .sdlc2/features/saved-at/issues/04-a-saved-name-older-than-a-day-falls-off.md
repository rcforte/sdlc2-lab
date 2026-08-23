# 04 — A saved name older than a day falls off on its own

Blocked by: 01-every-saved-name-shows-when-it-was-saved (the cutoff is measured from the saved-at
moment issue 01 adds), 02-the-newest-saved-name-is-marked (this issue's own scenario proving the
marker moves on when the newest row falls off needs the marker to already exist). Not blocked by
03-sort-the-list-newest-first: a row disappearing is correct under either sort view without a
view-specific rule, so no scenario here needs the sort control.

Dir: src/

## Story

As a **visitor whose visit has been open a long time**,
I want a name I saved more than a day ago to leave the list on its own,
so that the list stays a record of names I still care about, not everything I have ever typed.

A row falling off is a write to the list, not a tick (seed, Agreed scope), so it is announced the
way every other write to the list already is — but unlike a visitor's own removal, no control was
activated, so nothing destroys anything the visitor's focus was on, and focus does not move.

## Acceptance criteria

```gherkin
Scenario: A saved name falls off once more than a day has passed since it was saved
  Given the visitor saved "Ada"
  When more than 24 hours pass with the visitor doing nothing
  Then no row for "Ada" is present
  And the Saved names region's contents are announced

Scenario: A saved name does not fall off before a day has passed
  Given the visitor saved "Ada"
  When 23 hours and 59 minutes pass with the visitor doing nothing
  Then the row for "Ada" is still present

Scenario: The cutoff is measured from the saved-at moment, not a calendar boundary
  Given the visitor saved "Ada" at 23:50
  When 20 minutes pass with the visitor doing nothing, crossing midnight
  Then the row for "Ada" is still present

Scenario: Falling off does not move focus, unlike the visitor's own removal
  Given the visitor's focus is currently on the Name field
  And the visitor saved "Ada" earlier in the visit
  When more than 24 hours pass with the visitor doing nothing
  Then the Name field still has focus

Scenario: Falling off frees a slot for another save, exactly like removing does
  Given the visitor has saved five names, the oldest being "Ada", saved more than 24 hours ago
  And the other four were saved less than 24 hours ago
  When enough time passes that "Ada" falls off the list
  And the visitor has been greeted "Hello, Fay"
  And the visitor activates "Save this name"
  Then the Saved names region contains a row for "Fay"

Scenario: The newest marker moves on when the row wearing it falls off
  Given the visitor saved "Ada", then 23 hours later saved "Bob"
  And the row for "Bob" shows the label "Newest"
  When enough time passes that "Ada" is more than 24 hours old and "Bob" is not
  Then no row for "Ada" is present
  And the row for "Bob" still shows the label "Newest"

Scenario: Re-saving an already-saved name does not restart its 24-hour clock
  Given the visitor saved "Ada" 20 hours ago
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Ada is already saved."
  When 4 more hours pass with the visitor doing nothing
  Then no row for "Ada" is present
```
