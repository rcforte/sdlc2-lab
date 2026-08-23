# 02 — Greet me again as the saved name (walking skeleton, part 2 of 2)

Blocked by: 01-save-the-greeted-name (greeting again presupposes a saved name — there is nothing
to be greeted as until something has been saved).

Dir: src/

## Story

As a **visitor**,
I want a control that greets me again as the name I saved,
so that I am greeted that way without retyping it.

This is the second half of the walking skeleton (see feature.md, Story map, and issue 01): with
this issue landed, the whole capability the feature names is demonstrable end to end — save a
name, then use it. Greeting again is an ordinary greeting (feature.md, Decisions): it runs the
same state transition `greet-visitor` already has, with the saved name substituted for the
field's draft, so re-announcement-on-resubmit, alert-clearing and the untouched field all follow
from rules that already exist rather than a second, separate notion of "greeting".

Note on "re-announces even when the name is unchanged" (seed, Agreed scope): whether an
unchanged-text announcement is actually spoken is not observable under Vitest/jsdom, per the
precedent `greet-visitor`'s VERIFY-WITH-HUMAN.md VH-09/VH-10 set for the identical situation on
an ordinary resubmit. The scenario below asserts only the testable outcome — the greeting still
reads the saved name and no alert appears — not the announcement itself.

## Acceptance criteria

```gherkin
Scenario: The greet-again control is absent while nothing is saved
  Given the visitor is on the greeting screen
  And the visitor has not saved a name
  Then no button named "Greet me again" is present

Scenario: The greet-again control appears once a name is saved
  Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
  Then a button named "Greet me again" is present inside the Saved name region

Scenario: Greeting again greets as the saved name, not the current draft
  Given the visitor saved "Ada"
  And the visitor has since been greeted "Hello, Grace"
  When the visitor activates "Greet me again"
  Then the greeting reads "Hello, Ada"

Scenario: Greeting again works even when the saved name is already the greeting shown
  Given the visitor saved "Ada"
  And the greeting already reads "Hello, Ada"
  When the visitor activates "Greet me again"
  Then the greeting still reads "Hello, Ada"
  And no element with role "alert" is present

Scenario: Greeting again clears a standing blank-name alert
  Given the visitor saved "Ada"
  And the visitor submitted a blank Name field and an alert reads "Please enter your name."
  When the visitor activates "Greet me again"
  Then the greeting reads "Hello, Ada"
  And no element with role "alert" is present

Scenario: Greeting again leaves the Name field's draft untouched
  Given the visitor saved "Ada"
  And the visitor has typed "Grace" into the Name field without submitting
  When the visitor activates "Greet me again"
  Then the greeting reads "Hello, Ada"
  And the Name field still contains "Grace"

Scenario: Greeting again does not change the saved name
  Given the visitor saved "Ada"
  And the visitor has since been greeted "Hello, Grace" via the ordinary submit control
  When the visitor activates "Greet me again"
  Then the greeting reads "Hello, Ada"
  And the Saved name region still reads "Saved: Ada"

Scenario: The greet-again control sits outside the form and does not submit it
  Given the visitor saved "Ada"
  And the Name field now contains "Grace"
  When the visitor activates "Greet me again"
  Then the greeting reads "Hello, Ada"
  And the Name field still contains "Grace"
```
