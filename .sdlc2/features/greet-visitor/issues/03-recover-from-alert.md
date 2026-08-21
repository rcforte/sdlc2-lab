# 03 — Recover from a blank-name alert

Blocked by: 02-blank-name-alert

Dir: src/

## Story

As a **visitor**,
I want to fix my mistake and get greeted after seeing an alert,
so that I can complete my goal without a fresh page load.

This deepens the "See the outcome" backbone step for the recovery case: an alert (issue 02)
must not be a dead end within the same visit.

Note on the middle scenario ("The alert stays until the visitor submits again"): it fixes *when*
the error clears — on the next submission, not on the next keystroke. The seed says only that "an
error message explains what to do"; it does not say when the message goes away, so this is a
`po`-proposed behaviour, unconfirmed, recorded in `VERIFY-WITH-HUMAN.md` **VH-05** (the Gherkin
comment above the scenario carries the same flag). It is specified rather than left open because
everything else in this slice is submit-driven, and a message that vanishes mid-correction takes
the explanation away while the visitor is still acting on it. If a human prefers "clear on input",
that is one scenario and one condition to change.

Note on the two regions: "the status region is present and contains no text" is
`expect(screen.getByRole('status')).toHaveTextContent('')` — the region is always in the DOM. "No
element with role `alert` is present" is `expect(screen.queryByRole('alert')).toBeNull()` — the
alert really is removed. See feature.md, Contract vocabulary, and `VERIFY-WITH-HUMAN.md` VH-04.

## Acceptance criteria

```gherkin
Scenario: Correcting a blank submission clears the alert and shows the greeting
  Given the visitor submitted a blank Name field and sees the alert
  When the visitor types "Grace" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Grace"
  And no element with role "alert" is present
  And the Name field no longer has an aria-describedby reference to the alert

# (po-proposed behaviour, unconfirmed — see VERIFY-WITH-HUMAN.md VH-05)
Scenario: The alert stays until the visitor submits again
  Given the visitor submitted a blank Name field and sees the alert
  When the visitor types "Grace" into the Name field
  Then an alert still reads "Please enter your name to be greeted."
  And the Name field's aria-describedby attribute still references the element with role "alert"

Scenario: Retrying with a whitespace-only name still shows the alert
  Given the visitor submitted a blank Name field and sees the alert
  When the visitor types "   " into the Name field
  And the visitor activates the submit control
  Then an alert reads "Please enter your name to be greeted."
  And the status region is present and contains no text
```
