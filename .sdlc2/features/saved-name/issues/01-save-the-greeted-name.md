# 01 — Save the name I was greeted as (walking skeleton, part 1 of 2)

Blocked by: none (presupposes the existing, already-merged `greet-visitor` slice — saving needs
a prior greeting, and that greeting already ships).

Dir: src/

## Story

As a **visitor**,
I want to save the name I was just greeted as,
so that the visit holds onto it deliberately and I don't have to remember or retype it later.

This is the first half of the walking skeleton: the thinnest end-to-end slice through the
backbone `Arrive -> Enter a name -> Submit -> See the greeting -> Save it -> See it reflected ->
Use it again`. It ships first, together with issue 02, because "hold onto a name, then use it
again" is the whole capability this feature names — saving alone is only half the loop. This
story also carries the Saved name region's arrival state (nothing saved yet, in words, and the
save control absent before any greeting) — the arrival state for this backbone step, not a
deepening, exactly as `greet-visitor` issue 01 bundled the status region's at-rest state into its
own skeleton story. See feature.md, Story map.

Note on the region's content when a name is saved: the seed's Agreed copy fixes the empty state
("No name saved yet.") and the hint ("Saved: <name>") but not literally the region's text once
something is saved. feature.md's Contract vocabulary fixes it as the same string as the hint,
"Saved: <name>" — one phrase, reused, not a sixth invented one.

Note on "announced": whether saving is actually spoken by a screen reader is not observable under
Vitest/jsdom, per the precedent set by `greet-visitor`'s VERIFY-WITH-HUMAN.md VH-09/VH-10 for the
analogous requirement on the greeting status region. The scenarios below assert the testable half
only — the attribute `aria-live="polite"` on the Saved name region itself, and correct visible
text after each save. **Do not give the Saved name region `role="status"`.** That role belongs
solely to `greet-visitor`'s already-shipped, human-confirmed **Status region** and is exercised by
seventeen bare `getByRole('status')` assertions in the merged `src/GreetingScreen.test.tsx`; a
second element with that role makes every one of those throw on "multiple elements". See
feature.md's Contract vocabulary, "Announced".

## Acceptance criteria

```gherkin
Scenario: The Saved name region is present and empty before any greeting
  Given the visitor is on the greeting screen
  And the visitor has not been greeted yet
  Then the Saved name region is present
  And the Saved name region appears after the status region in the page
  And the Saved name region reads "No name saved yet."
  And the Saved name region has the attribute aria-live="polite"
  And no button named "Save this name" is present

Scenario: The save control appears only once there has been a greeting
  Given the visitor is on the greeting screen
  And no button named "Save this name" is present
  When the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then a button named "Save this name" is present inside the Saved name region

Scenario: A blank submission does not summon the save control
  Given the visitor is on the greeting screen
  And the visitor has not been greeted yet
  When the visitor submits a blank Name field
  Then an alert reads "Please enter your name."
  And no button named "Save this name" is present

Scenario: Saving captures the name the visitor was just greeted as
  Given the visitor has been greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved name region reads "Saved: Ada"
  And "No name saved yet." is no longer shown
  And the Saved name region still has the attribute aria-live="polite"

Scenario: Saving does not move focus
  Given the visitor has been greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the "Save this name" button still has focus

Scenario: Saving captures the greeting, never an untyped draft in the Name field
  Given the visitor has been greeted "Hello, Ada"
  When the visitor clears the Name field
  And the visitor types "Grace" into the Name field without submitting
  And the visitor activates "Save this name"
  Then the Saved name region reads "Saved: Ada"
  And the Name field still contains "Grace"

Scenario: A blank submission never touches the saved name
  Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then an alert reads "Please enter your name."
  And the Saved name region still reads "Saved: Ada"

Scenario: The save control sits outside the form and does not submit it
  Given the visitor has been greeted "Hello, Ada"
  And the Name field now contains "Grace"
  When the visitor activates "Save this name"
  Then the greeting still reads "Hello, Ada"

Scenario: Pressing Enter in the Name field still greets from the field, unaffected by the save control
  Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
  When the visitor types "Grace" into the Name field
  And the visitor presses Enter while focus is in the Name field
  Then the greeting reads "Hello, Grace"
  And the Saved name region still reads "Saved: Ada"
```
