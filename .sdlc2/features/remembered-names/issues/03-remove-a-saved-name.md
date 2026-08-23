# 03 — Remove a saved name

Blocked by: 01-hold-more-than-one-saved-name — removing needs a saved name to remove, and a list
holding more than one to prove removal takes out exactly one and leaves the others in order. Not
blocked by 02-greet-again-as-any-saved-name: per feature.md's "What depends on what", both row
controls presuppose a saved name and need nothing from each other — greeting again is correct
with no remove control anywhere on screen, and removing is correct whether or not the visitor
ever greets again.

Dir: src/

## Story

As a **visitor who saved a name by mistake, or no longer wants it kept**,
I want a "Remove `<name>`" control on every row,
so that I can drop just that one name and keep every other name I meant to keep.

Deepens the "Correct the list" backbone step (feature.md, Story map). Per the seed's Decisions:
lifting the single-slot limit takes away the old escape hatch (replacing) — without removal, a
mistyped name would sit on screen for the rest of the visit, next to its own greet-again control.
Per-name removal is the only shape that drops the typo while keeping the names that were meant.

Focus handling note (seed Decisions, "Removing moves focus; saving still does not"): the control
that was pressed is destroyed by the removal, so — unlike saving — focus must move somewhere. It
moves to the Saved names region itself, which then announces its own new contents; there is no
special case for removing the last name.

## Acceptance criteria

```gherkin
Scenario: A row's remove control names the row's own name
  Given the visitor has saved "Ada" and "Bob", in that order
  Then a button named "Remove Ada" is present
  And a button named "Remove Bob" is present

Scenario: Removing takes out exactly one name and keeps the others in order
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  When the visitor activates "Remove Bob"
  Then the Saved names region contains a row for "Ada" and a row for "Cleo", in that order
  And no row for "Bob" is present

Scenario: Removing moves focus to the Saved names region
  Given the visitor has saved "Ada" and "Bob", in that order
  When the visitor activates "Remove Ada"
  Then the Saved names region has focus

Scenario: Removing the only saved name returns the region to its empty state
  Given the visitor has saved "Ada" only
  When the visitor activates "Remove Ada"
  Then the Saved names region reads "No names saved yet."
  And the Saved names region has focus

Scenario: Removing does not touch the greeting
  Given the visitor has saved "Ada" and is currently greeted "Hello, Ada"
  When the visitor activates "Remove Ada"
  Then the greeting still reads "Hello, Ada"

Scenario: Removing frees a slot for another save
  Given the visitor has saved "Ada" only
  When the visitor activates "Remove Ada"
  And the visitor types "Bob" into the Name field
  And the visitor activates the submit control
  And the visitor activates "Save this name"
  Then the Saved names region contains a row for "Bob" only

Scenario: The remove control sits outside the form and does not submit it
  Given the visitor has saved "Ada"
  And the Name field now contains "Grace"
  When the visitor activates "Remove Ada"
  Then the greeting is unaffected by the removal
  And the Name field still contains "Grace"
```
