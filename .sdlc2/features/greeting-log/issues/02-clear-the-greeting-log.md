# 02 — Clear the greeting log

Blocked by: 01-see-the-greeting-log-grow

Dir: src/

## Story

As a **visitor**,
I want to clear the greeting log when I'm done with it,
so that the greeting log and the current greeting go back to how they looked before I was greeted
at all — not the whole screen, which may still be showing an unrelated alert or an unsubmitted
draft in the Name field (see `VERIFY-WITH-HUMAN.md` VH-03).

Blocked by issue 01: the seed's own Decisions section says so directly — "clearing cannot be
demonstrated until there is something to clear." This walks the "Clear the log when done"
backbone step for the first time — the walking skeleton (issue 01) never touches this step at
all, so this issue adds coverage of a step left out, rather than deepening a step already walked
(see feature.md, Story map).

Note on the clear control's accessible name: "Clear the log" is `po-proposed, unconfirmed` — see
feature.md, Contract vocabulary, and `VERIFY-WITH-HUMAN.md` VH-01, VH-04 and VH-05 ("Clear the
list" is the alternative a human may confirm instead). Present in the DOM only while the greeting
log has at least one entry; absent otherwise.

Note on "returns to how it looked before": the status region goes back to exactly the
**Not-yet-greeted appearance** (present, holding no text — feature.md, Contract vocabulary),
never a second, different "cleared" message. The Name field is left untouched by clearing — it
holds the visitor's draft, not a greeting.

Note on focus: clearing destroys the control that was focused, so focus must move somewhere real
and audible. It moves to the greeting log region itself (`tabIndex={-1}`, focusable
programmatically, not in the tab order): `expect(logRegion).toHaveFocus()`.

## Acceptance criteria

```gherkin
Scenario: No clear control is present before the first greeting
  Given the visitor is on the greeting screen
  And the visitor has not been greeted yet
  Then the clear control is not present

Scenario: The clear control appears once the greeting log has an entry
  Given the visitor is on the greeting screen
  When the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then the clear control is present

Scenario: Clearing empties the greeting log and removes the current greeting
  Given the visitor has already been greeted "Hello, Ada" and then "Hello, Grace" this visit
  When the visitor activates the clear control
  Then the greeting log is empty
  And the status region is present and contains no text

Scenario: Clearing removes the clear control itself
  Given the visitor has already been greeted "Hello, Ada" this visit
  When the visitor activates the clear control
  Then the clear control is not present

Scenario: Clearing does not touch the Name field
  Given the visitor has already been greeted "Hello, Ada" this visit
  And the visitor clears the Name field
  And the visitor types "Grace" into the Name field without submitting it
  When the visitor activates the clear control
  Then the Name field still contains "Grace"

Scenario: Focus moves to the greeting log after clearing
  Given the visitor has already been greeted "Hello, Ada" this visit
  When the visitor activates the clear control
  Then the greeting log has focus

Scenario: A greeting after clearing starts the greeting log again
  Given the visitor has already been greeted "Hello, Ada" this visit
  And the visitor activated the clear control
  When the visitor types "Grace" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Grace"
  And the greeting log has exactly one entry, oldest first: "Grace"
  And the clear control is present

Scenario: Clearing does not dismiss a pending alert
  Given the visitor has already been greeted "Hello, Ada" this visit
  And the visitor has since submitted a blank Name field and sees the alert
  When the visitor activates the clear control
  Then the greeting log is empty
  And the status region is present and contains no text
  And an alert still reads "Please enter your name."
```

Note on the seventh scenario ("A greeting after clearing..."): required so no implementation
latches a "cleared" flag that suppresses further entries or permanently hides the clear control —
clearing is a one-time action on the log's current contents, not a mode the screen gets stuck in.

Note on the eighth scenario ("Clearing does not dismiss a pending alert"): the clear control is
not a submission, so it does not touch the alert — `greet-visitor`'s own rule (feature.md, Story
3: "The alert stays until the visitor submits again") is that the alert is dismissed only by a
subsequent submission. Clearing acts only on the log and the current greeting.
