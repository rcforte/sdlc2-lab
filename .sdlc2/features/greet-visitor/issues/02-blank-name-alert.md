# 02 — Be told when the name is blank

Blocked by: 01-get-greeted-by-name

Dir: src/

## Story

As a **visitor**,
I want to see an explanatory alert when I submit without a name,
so that I understand what to do to be greeted.

This deepens the "See the outcome" backbone step for the blank/whitespace-only case the
walking skeleton (issue 01) does not cover.

Note on the seed's "error is text, not colour" decision (feature.md, Decisions section): its
testable half is asserted by the scenarios below — the alert carries its meaning in words and is
tied to the Name field via `aria-describedby`, so a screen-reader visitor gets the message and
knows which field it belongs to without relying on colour. Only the other half — no colour-only
signal (a red border, or red text with no words) — is not DOM-observable under Vitest + jsdom; it
is honoured by the implementation and checked by a human at VERIFY time against
`VERIFY-WITH-HUMAN.md` VH-07.

Note on the two regions: the **status region** is present from the first render and stays
present, so "the status region is present and contains no text" is the single observation
`expect(screen.getByRole('status')).toHaveTextContent('')` — not "the region may be absent". The
**alert**, by contrast, is absent from the DOM when there is no error
(`expect(screen.queryByRole('alert')).toBeNull()`). See feature.md, Contract vocabulary, and
`VERIFY-WITH-HUMAN.md` VH-04.

Note on blankness: "blank" means blank after `String.prototype.trim()` — all leading/trailing
JavaScript whitespace, not the space character alone. The tab-only scenario below exists so an
implementation that strips only the space character fails. See feature.md, Contract vocabulary
(**Trimmed**), and `VERIFY-WITH-HUMAN.md` VH-08. "Enters" means those exact characters end up in
the field's value; a literal Tab keystroke would move focus, so `user-event`'s paste is the
reliable way to get a tab in.

## Acceptance criteria

```gherkin
Scenario: Submitting an empty Name field shows an alert and no greeting
  Given the visitor is on the greeting screen
  And the Name field is empty
  When the visitor activates the submit control
  Then the status region is present and contains no text
  And an alert reads "Please enter your name."

Scenario: Submitting a whitespace-only name is treated as blank
  Given the visitor is on the greeting screen
  When the visitor types "   " into the Name field
  And the visitor activates the submit control
  Then the status region is present and contains no text
  And an alert reads "Please enter your name."

Scenario: A tab-only name is treated as blank too
  Given the visitor is on the greeting screen
  When the visitor enters "\t" (a single tab character) into the Name field
  And the visitor activates the submit control
  Then the status region is present and contains no text
  And an alert reads "Please enter your name."

Scenario: A blank submission does not clear an existing greeting
  Given the visitor has already been greeted "Hello, Ada"
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then the greeting still reads "Hello, Ada"
  And an alert reads "Please enter your name."

Scenario: The alert is tied to the Name field
  Given the visitor is on the greeting screen
  And the Name field is empty
  When the visitor activates the submit control
  Then the Name field's aria-describedby attribute references the element with role "alert"
```
