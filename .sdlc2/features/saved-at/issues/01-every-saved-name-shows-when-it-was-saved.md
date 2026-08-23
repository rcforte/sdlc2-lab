# 01 — Every saved name shows when it was saved, and the reading stays honest (walking skeleton)

Blocked by: none (presupposes the existing, already-merged `remembered-names` feature — a visit
already holds an ordered list of saved names, each removable, each carrying "Greet me again as
`<name>`" and "Remove `<name>`"). This issue adds a saved-at moment to every saved name and shows
it as a live, honest age reading, with a stable absolute time exposed to assistive technology in
its place.

Dir: src/

## Story

As a **visitor with one or more saved names**,
I want each row to show, in words, how long ago I saved it — and to keep that wording true while I
sit here, not freeze at whatever it said when the row first appeared,
so that I can tell my most recent save from one I made minutes ago without doing any arithmetic
myself.

This is the walking skeleton: the thinnest end-to-end slice through the backbone `Save a name ->
Read a row -> Read a row without sight`. The seed's own capability statement — "gives every saved
name a moment, shows that moment in the words a person would actually use… keeps that wording
honest as time passes rather than freezing" — is proven only once a moment is captured, shown in
words, kept alive unprompted, **and** offered as a stable time to assistive technology, all
together. Marking the newest (issue 02), sorting (issue 03) and the day-old cutoff (issue 04) all
build on the moment this issue captures; none of them is needed to prove this issue's own promise.

See feature.md, Story map, Decisions (product owner) and Agreed copy for the exact wording rules
this issue's scenarios below assume: "saved just now" under a minute, "saved N minute(s) ago" from
one minute, "saved N hour(s) ago" from sixty minutes, and the re-save rule (keep, never refresh)
that this issue's own last scenario proves and that issues 02–04 each carry forward for their own
consumer of the moment.

## Acceptance criteria

```gherkin
Scenario: A newly saved name reads "saved just now"
  Given the visitor has been greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the row for "Ada" shows the age reading "saved just now"

Scenario: The age reading counts up in minutes, unprompted, while the screen stays open
  Given the visitor saved "Ada" and the row for "Ada" reads "saved just now"
  When 60 seconds pass with the visitor doing nothing
  Then the row for "Ada" shows the age reading "saved 1 minute ago"
  When another 60 seconds pass with the visitor doing nothing
  Then the row for "Ada" shows the age reading "saved 2 minutes ago"

Scenario: The age reading moves from minutes to hours after sixty minutes
  Given the visitor saved "Ada" and the row for "Ada" reads "saved just now"
  When 60 minutes pass with the visitor doing nothing
  Then the row for "Ada" shows the age reading "saved 1 hour ago"

Scenario: Two rows' age readings are independent
  Given the visitor saved "Ada", then 2 minutes later saved "Bob"
  Then the row for "Ada" shows the age reading "saved 2 minutes ago"
  And the row for "Bob" shows the age reading "saved just now"

Scenario: The age reading is hidden from assistive technology; a stable absolute time takes its place
  Given the visitor saved "Ada"
  Then the row for "Ada" has an accessible name that includes a stable absolute time
  And the row for "Ada" has an accessible name that does not include the words "ago" or "just now"
  When 5 minutes pass with the visitor doing nothing
  Then the row for "Ada"'s accessible name still includes that same stable absolute time, unchanged

Scenario: Re-saving an already-saved name does not restart its age reading
  Given the visitor saved "Ada" 10 minutes ago
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Ada is already saved."
  And the row for "Ada" still shows the age reading "saved 10 minutes ago"

Scenario: An empty list shows no age reading at all
  Given the visitor has not saved any name
  Then the Saved names region reads "No names saved yet."
  And no text reading "ago" is present
```
