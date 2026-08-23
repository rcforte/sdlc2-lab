# 03 — Be reminded of the saved name at the Name field

Blocked by: 01-save-the-greeted-name (the hint presupposes a saved name — there is nothing to
hint at until something has been saved).

Not blocked by 02-greet-again-as-the-saved-name — the seed states "greeting again and the hint
need nothing from each other": greeting again works correctly with no hint anywhere on the
screen, and the hint is correct whether or not the visitor ever greets again. They are siblings,
both unblocked once issue 01 lands.

Dir: src/

## Story

As a **visitor**,
I want a reminder of my saved name near the Name field,
so that I know a name is already saved without checking elsewhere or having to remember it
myself.

This deepens the "See it reflected" backbone step the walking skeleton (issues 01-02) does not
cover: a second, independent place the same one fact is shown. The hint is associated
description, not a placeholder (feature.md, Decisions) — a placeholder vanishes on the first
keystroke and would fight the field's own content, and visible text with no association would
leave a visitor focused in the field unable to learn the saved name at all.

Note on ordering: when a blank-name alert (from `greet-visitor`) is also present, the field's
accessible description is the alert's text followed by the hint's — the error about the
submission just made outranks a standing piece of context (feature.md, Decisions). Under the
declared frontend seam this is one observation:
`expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Please enter your name. Saved: Ada')`.

Note on visibility: the seed calls the hint "visible text ... programmatically associated with the
field as a description" (Agreed scope) — both halves are required, not the association alone. An
`aria-describedby` pointing at a visually-hidden node would satisfy `toHaveAccessibleDescription`
while showing a sighted visitor nothing at the field, which is exactly the gap
`toHaveAccessibleDescription` cannot see on its own; the second scenario's added step asserts the
described element is visible, scoped to the element the field is described by rather than by text
(the Saved name region also reads "Saved: Ada", so a bare `getByText` would match two nodes).

## Acceptance criteria

```gherkin
Scenario: No hint while nothing is saved
  Given the visitor is on the greeting screen
  And the visitor has not saved a name
  Then the Name field has no accessible description

Scenario: The hint appears once a name is saved
  Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
  Then the Name field has the accessible description "Saved: Ada"
  And the element the Name field is described by is visible

Scenario: The hint stays present while the visitor is mid-draft
  Given the visitor saved "Ada"
  When the visitor types "Grace" into the Name field without submitting
  Then the Name field still has the accessible description "Saved: Ada"

Scenario: The hint updates when the saved name is replaced
  Given the visitor saved "Ada"
  And the visitor has since been greeted "Hello, Grace"
  When the visitor activates "Save this name"
  Then the Name field has the accessible description "Saved: Grace"

Scenario: When a blank-name alert is also on screen, the alert is described first
  Given the visitor saved "Ada"
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then the Name field's accessible description reads "Please enter your name. Saved: Ada"
```
