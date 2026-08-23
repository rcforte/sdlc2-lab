# 06 — Be reminded of every saved name at the Name field

Blocked by: 01-hold-more-than-one-saved-name — the hint needs at least one saved name to name.
Not blocked by 02-greet-again-as-any-saved-name or 03-remove-a-saved-name: per feature.md's "What
depends on what", the hint presupposes a saved name and needs nothing from the row controls.

Dir: src/

## Story

As a **visitor about to type a name**,
I want the Name field to remind me which names are already saved,
so that I don't have to hold the whole list in my head while deciding what to save next.

Deepens the "Be reminded while typing" backbone step (feature.md, Story map). Replaces the merged
single-slot hint ("Saved: `<name>`") with a list-shaped one naming every saved name in save order,
same phrasing pattern, same association rule, same alert-before-hint ordering when both describe
the field — carried unchanged from the single-slot feature per the seed's Agreed scope.

## Acceptance criteria

```gherkin
Scenario: The hint is absent while nothing is saved
  Given the visitor has not saved any name
  Then no element with the text "Saved:" is present
  And the Name field has no description referring to saved names

Scenario: The hint lists every saved name, in the order they were saved
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  Then the Name field is described by text reading "Saved: Ada, Bob, Cleo"

Scenario: The hint updates as each further name is saved
  Given the visitor has saved "Ada"
  And the Name field is described by text reading "Saved: Ada"
  When the visitor is greeted as "Bob" and saves that name too
  Then the Name field is described by text reading "Saved: Ada, Bob"

Scenario: The hint is present while the visitor is mid-draft
  Given the visitor has saved "Ada"
  When the visitor types "Gr" into the Name field without submitting
  Then the Name field is still described by text reading "Saved: Ada"

Scenario: When a blank-name alert and the hint are both present, the alert is described first
  Given the visitor has saved "Ada"
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then an alert reads "Please enter your name."
  And the Name field's description lists the alert before the saved-name hint
```

## Amendment — VH-06 (taken by the `developer` node, needs a human)

The third scenario used to read *"The hint updates as names are saved and removed"*, and its
`When` activated **"Remove Ada"** — a control that `03-remove-a-saved-name` introduces and that
this issue declares no dependency on. The architect filed that mismatch as the queue defect
**VH-01**; nobody resolved it, and the lane cannot both keep the step and stay independent.

So the scenario above was narrowed to its saving half, which this lane can run. **The removing
half is deferred, not dropped**: `VERIFY-WITH-HUMAN.md` **VH-06** carries the exact assertion it
owes and names where it must land. See VH-06 before reversing this.
