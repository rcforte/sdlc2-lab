# 02 — The offer holds only while the list is exactly as the removal left it

Blocked by: 01-bring-back-the-last-removed-name (there is nothing to replace, end, or let survive
until an offer exists to test those things against).

Dir: src/

## Story

As a **visitor whose removal is being offered back**,
I want the offer to disappear the moment anything happens that would make bringing the name back
wrong, and to keep working through everything that would not,
so that pressing it is always either certain to work or simply not there — never a guess about
what it will do.

This is ADR-0043 made observable: the offer never refuses, so instead it has to end at exactly the
right moments — replaced by a newer removal, ended by a successful save or a fall-off — and survive
everything else, including a refused save. See feature.md, Decisions (product owner) for why a
refused save specifically does **not** end the offer: it is the reading under which the seed's own
"bringing a name back clears a standing refusal" (Agreed scope) can ever actually happen, since a
refusal that also killed the offer could never coexist with a live one to clear.

## Acceptance criteria

```gherkin
Scenario: The offer does not time out on its own
  Given the visitor has saved "Ada" only
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When 10 minutes pass with the visitor doing nothing
  Then a button named "Bring Ada back" is still present

Scenario: A further removal replaces the offer, and only the later removal comes back
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When the visitor activates "Remove Bob"
  Then a button named "Bring Bob back" is present
  And no button named "Bring Ada back" is present
  When the visitor activates "Bring Bob back"
  Then the Saved names region contains a row for "Bob" only

Scenario: A successful save ends the offer
  Given the visitor has saved "Ada" only
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When the visitor is greeted "Hello, Bob" and activates "Save this name"
  Then no button named "Bring Ada back" is present
  And the Saved names region contains a row for "Bob" only

Scenario: A name falling off ends the offer, even a name other than the held one
  Given the visitor saved "Bob" 23 hours and 58 minutes ago, then saved "Ada" just now
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When 3 more minutes pass with the visitor doing nothing
  Then no row for "Bob" is present
  And no button named "Bring Ada back" is present

Scenario: A refused save does not end the offer, and pressing the offer still works and clears the refusal
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor activated "Remove Bob", so a button named "Bring Bob back" is present
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Ada is already saved."
  And a button named "Bring Bob back" is still present
  When the visitor activates "Bring Bob back"
  Then the Saved names region displays rows in the order "Ada", "Bob"
  And the Saved names region does not read "Ada is already saved."

Scenario: The offer survives everything that does not write to the list
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor activated "Remove Bob", so a button named "Bring Bob back" is present
  When the visitor checks "Newest first"
  Then a button named "Bring Bob back" is still present
  When the visitor submits a blank Name field
  Then a button named "Bring Bob back" is still present
  When the visitor activates "Greet me again as Ada"
  Then a button named "Bring Bob back" is still present

Scenario: Once spent, the offer does not return on its own; removing the same name again starts a fresh one
  Given the visitor has saved "Ada" only
  And the visitor activated "Remove Ada" then "Bring Ada back", so no button named "Bring Ada back" is present
  When the visitor activates "Remove Ada" again
  Then a button named "Bring Ada back" is present
```
