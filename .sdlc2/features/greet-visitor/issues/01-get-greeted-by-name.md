# 01 — Get greeted by name (walking skeleton)

Blocked by: none

Dir: src/

## Story

As a **visitor**,
I want to type my name and submit it,
so that I see a greeting that responds to me instead of everyone identically.

The first scenario below is the walking skeleton: the thinnest end-to-end slice through the
backbone `Arrive at the greeting screen -> Enter a name -> Submit -> See the outcome`. It ships
first and proves the whole journey before any step is deepened by later issues. The remaining
five scenarios are the screen's arrival state and tightly-coupled name-handling variations of
that same "valid name" path (the status region at rest, trimming spaces, trimming tabs, no length
limit, replacing a previous greeting) — not a deepening in the story-map sense, since none
introduces a different outcome shape — so they ship in this same issue (see feature.md, Story
map).

Note: whether the Name field and submit control sit inside a native `<form>` (which gives
Enter-to-submit for free) is an open, unconfirmed question — no scenario in this issue asserts
Enter-to-submit behaviour in either direction, so either implementation satisfies every scenario
below. See feature.md, Out of scope, and `VERIFY-WITH-HUMAN.md` VH-01.

Note on the status region: it is **present in the DOM from the first render and stays present**,
holding no text until there is a greeting. "An element with role `status` is present / that
element contains no text" is the single observation
`expect(screen.getByRole('status')).toHaveTextContent('')`, and "the greeting reads X" is
`toHaveTextContent('X')` on that same element. The region is never absent — a live region created
at the moment its text arrives is unreliably announced, which would break the seed's "and is
announced to the visitor". See feature.md, Contract vocabulary (**Status region**), and
`VERIFY-WITH-HUMAN.md` VH-04.

Note on "enters" vs "types": "enters" means only that those exact characters end up in the Name
field's value; it does not prescribe keystrokes. Under the declared frontend seam a literal Tab
keystroke moves focus rather than inserting a character, so `user-event`'s paste is the reliable
way to get a tab into the field. "Trimmed" throughout means `String.prototype.trim()` semantics
(all leading/trailing JavaScript whitespace, not the space character alone) — see feature.md,
Contract vocabulary (**Trimmed**), and `VERIFY-WITH-HUMAN.md` VH-08.

## Acceptance criteria

```gherkin
Scenario: Visitor is greeted by the name they typed
  Given the visitor is on the greeting screen
  And the existing heading "sdlc2 lab" is shown
  And the Name field is empty
  When the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And the greeting is exposed as a live status region (role="status")
  And the Name field has an accessible label "Name"
  And the submit control has the accessible name "Greet me"
  And the Name field still contains "Ada"
  And the existing heading "sdlc2 lab" is still shown

Scenario: The status region is present and empty before the first submission
  Given the visitor is on the greeting screen
  And the visitor has not submitted anything yet
  Then an element with role "status" is present
  And that element contains no text
  And no element with role "alert" is present

Scenario: Leading and trailing whitespace is trimmed before greeting
  Given the visitor is on the greeting screen
  When the visitor types " Ada " into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And the Name field still contains " Ada " unchanged (only the greeting is trimmed)

Scenario: Tabs around the name are trimmed too
  Given the visitor is on the greeting screen
  When the visitor enters "\tAda\t" (tab, "Ada", tab) into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And no element with role "alert" is present

Scenario: There is no length limit on the name
  Given the visitor is on the greeting screen
  When the visitor types a 300-character name ("A" repeated 300 times) into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, " followed by those same 300 characters, unmodified
  And no element with role "alert" is present

Scenario: Submitting a new name replaces the previous greeting
  Given the visitor has already been greeted "Hello, Ada"
  When the visitor clears the Name field
  And the visitor types "Grace" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Grace"
  And "Hello, Ada" is no longer shown
```
