# 01 — Bring back the last removed name (walking skeleton)

Blocked by: none (presupposes the existing, already-merged `remembered-names` and `saved-at`
features — a visit already holds an ordered list of saved names, each removable, each carrying a
saved-at moment, an age reading, and the Newest marker). This issue adds the offer itself: a
removal leaves a named control that restores the removed entry whole.

Dir: src/

## Story

As a **visitor who just removed a saved name by mistake**,
I want a control that names the name I removed and offers to bring it back exactly as it was,
so that undoing a mis-press costs one press instead of retyping the name, greeting as it, and
saving it again.

This is the walking skeleton: the thinnest end-to-end slice through the backbone `Remove a name ->
The offer appears -> Bring it back`. The seed's own capability statement — "after a removal, it
offers to bring that name back — the same name, the same moment, the same place in the list — so
that taking back a mistake is one press" — is proven only once the offer appears, is named for the
right name, sits in the right place, and restores the entry whole (same text, same moment, same
place), with focus and the greeting handled exactly as the seed requires. An offer nobody can press
proves nothing, and a restore control with no offer to press does not exist — that pairing is why
this is one slice, not two. The offer's lifecycle (issue 02) and its ageing (issue 03) both build on
this issue and are both about *when* this control exists at all; neither is needed to prove this
issue's own promise.

See feature.md, Decisions (product owner) for why a refused save does not end an offer (ADR-0043's
own boundary, settled there) — this issue's own scenarios do not depend on that decision, but issue
02's do.

## Acceptance criteria

```gherkin
Scenario: No offer exists until a removal happens
  Given the visitor has saved "Ada"
  Then no button named "Bring Ada back" is present

Scenario: Removing a name offers to bring it back, named for that name
  Given the visitor has saved "Ada" and "Bob", in that order
  When the visitor activates "Remove Bob"
  Then a button named "Bring Bob back" is present in the Saved names region

Scenario: The offer sits between the heading and the rows
  Given the visitor has saved "Ada" and "Bob", in that order
  When the visitor activates "Remove Bob"
  Then the button named "Bring Bob back" appears before the row for "Ada" in the Saved names region

Scenario: Bringing the name back restores it with its own saved-at moment, not a fresh one
  Given the visitor saved "Ada" 10 minutes ago
  And the visitor activated "Remove Ada" just now, so a button named "Bring Ada back" is present
  When the visitor activates "Bring Ada back"
  Then the row for "Ada" shows the age reading "saved 10 minutes ago"

Scenario: Bringing the name back restores its original place, and leaves every other row exactly as it was
  Given the visitor has saved "Ada" and "Bob", in that order, and the row for "Bob" shows the age reading "saved 5 minutes ago"
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When the visitor activates "Bring Ada back"
  Then the Saved names region displays rows in the order "Ada", "Bob"
  And the row for "Bob" still shows the age reading "saved 5 minutes ago"
  And the Name field is described by text reading "Saved: Ada, Bob"

Scenario: Bringing back an older name does not steal the newest marker
  Given the visitor has saved "Ada" then "Bob", in that order, and the row for "Bob" shows the label "Newest"
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When the visitor activates "Bring Ada back"
  Then the row for "Bob" still shows the label "Newest"
  And the row for "Ada" does not show the label "Newest"

Scenario: Bringing the name back moves focus to the Saved names region, which shows the name back in it
  Given the visitor has saved "Ada" only
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When the visitor activates "Bring Ada back"
  Then the Saved names region has focus
  And the Saved names region contains a row for "Ada"

Scenario: The offer is spent once pressed
  Given the visitor has saved "Ada" only
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When the visitor activates "Bring Ada back"
  Then no button named "Bring Ada back" is present

Scenario: Bringing the name back does not change who the visitor is greeted as
  Given the visitor has saved "Ada" and is currently greeted "Hello, Bob"
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When the visitor activates "Bring Ada back"
  Then the greeting still reads "Hello, Bob"

Scenario: Removing the last saved name shows the empty state and the offer together
  Given the visitor has saved "Ada" only
  When the visitor activates "Remove Ada"
  Then the Saved names region reads "No names saved yet."
  And a button named "Bring Ada back" is present
  And no checkbox named "Newest first" is present

Scenario: Bringing a name back never overfills the list, even when it was at the five-name limit
  Given the visitor has saved "Ada", "Bob", "Cleo", "Dan" and "Eve"
  And the visitor activated "Remove Eve", so a button named "Bring Eve back" is present
  When the visitor activates "Bring Eve back"
  Then the Saved names region displays rows in the order "Ada", "Bob", "Cleo", "Dan", "Eve"
  And the Saved names region does not read "Five names is the limit. Remove one to save another."

Scenario: A name that falls off on its own is never offered back
  Given the visitor saved "Ada" 23 hours and 58 minutes ago
  When 3 more minutes pass with the visitor doing nothing
  Then no row for "Ada" is present
  And no button named "Bring Ada back" is present
```
