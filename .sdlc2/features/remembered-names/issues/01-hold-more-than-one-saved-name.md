# 01 — Hold more than one saved name (walking skeleton, part 1 of 2)

Blocked by: none (presupposes the existing, already-merged single-slot `saved-name` feature —
saving still needs a prior greeting, and the greeting and the merged `Saved this name` control
already ship). This issue replaces the merged single-slot behaviour: the saved name stops being
one scalar and becomes an ordered, append-only list, up to five, oldest first.

Dir: src/

## Story

As a **visitor**,
I want each name I save to be added to the list rather than replace what I already saved,
so that saving a second name never throws away the first.

This is the first half of the walking skeleton: the thinnest end-to-end slice through the
backbone `Arrive -> Greet -> Save -> See the list -> Use any saved name -> Correct the list ->
Be reminded while typing`. It ships together with issue 02, because "hold several, use any of
them" is the whole promise this feature makes — saving alone only proves a row was drawn, not
that anything survived a second save. This story also carries the Saved names region's arrival
state (nothing saved yet, in words, and the save control absent before any greeting) and the
region's heading change from "Saved name" to "Saved names" — the arrival state for this backbone
step, not a deepening, exactly as the single-slot `saved-name` issue 01 bundled its own region's
at-rest state into its own skeleton story. See feature.md, Story map.

Row controls ("Greet me again as `<name>`" and "Remove `<name>`") are **not** part of this
story — they are introduced by issues 02 and 03. A row here is name text only.

Note on "announced": whether saving is actually spoken by a screen reader is not observable under
Vitest/jsdom, per the precedent set by `greet-visitor`'s VERIFY-WITH-HUMAN.md VH-09/VH-10 and
carried forward by the merged `saved-name` feature. The scenarios below assert the testable half
only — the attribute `aria-live="polite"` on the Saved names region itself, and correct visible
text after each save. **Do not give the Saved names region `role="status"`.** That role belongs
solely to `greet-visitor`'s already-shipped, human-confirmed **Status region**, exercised by many
bare `getByRole('status')` assertions in the merged `src/GreetingScreen.test.tsx`; a second
element with that role makes every one of those throw on "multiple elements".

## Acceptance criteria

```gherkin
Scenario: The Saved names region is present and empty before any greeting
  Given the visitor is on the greeting screen
  And the visitor has not been greeted yet
  Then the Saved names region is present
  And the Saved names region appears after the status region in the page
  And the Saved names region reads "No names saved yet."
  And the Saved names region has the attribute aria-live="polite"
  And no button named "Save this name" is present

Scenario: The save control appears only once there has been a greeting
  Given the visitor is on the greeting screen
  And no button named "Save this name" is present
  When the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then a button named "Save this name" is present inside the Saved names region

Scenario: Saving the first name adds one row
  Given the visitor has been greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region contains a row for "Ada"
  And "No names saved yet." is no longer shown

Scenario: Saving a second, different name adds a second row without losing the first
  Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
  When the visitor types "Bob" into the Name field
  And the visitor activates the submit control
  And the visitor activates "Save this name"
  Then the Saved names region contains a row for "Ada" and a row for "Bob"
  And the row for "Ada" appears before the row for "Bob"

Scenario: Saving does not move focus
  Given the visitor has been greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the "Save this name" button still has focus

Scenario: Saving captures the greeting, never an untyped draft in the Name field
  Given the visitor has been greeted "Hello, Ada"
  When the visitor clears the Name field
  And the visitor types "Grace" into the Name field without submitting
  And the visitor activates "Save this name"
  Then the Saved names region contains a row for "Ada" only
  And the Name field still contains "Grace"

Scenario: A blank submission never touches the saved names
  Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then an alert reads "Please enter your name."
  And the Saved names region still contains a row for "Ada" only

Scenario: The save control sits outside the form and does not submit it
  Given the visitor has been greeted "Hello, Ada"
  And the Name field now contains "Grace"
  When the visitor activates "Save this name"
  Then the greeting still reads "Hello, Ada"
```
