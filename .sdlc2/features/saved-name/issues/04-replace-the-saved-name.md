# 04 — Replace the saved name

Blocked by: 01-save-the-greeted-name (replacing presupposes an existing save). Not blocked by 02
or 03 — this story exercises only the save control and the region it writes to.

Dir: src/

## Story

As a **visitor**,
I want saving again to replace whichever name I saved before,
so that the visit always holds the one name I most recently chose to keep.

This deepens the "Save it" backbone step for the case where a name is already saved. One slot,
replaced silently (feature.md, Decisions): keeping the saved name a scalar is what stops this
feature from becoming the greeting log, and last write wins because a confirmation would need an
undo, and an undo would need a history — neither of which anyone asked for.

Note on the third scenario: whether an identical replace should announce or fall silent is the
seed's own stated Open question, not resolved by this issue. The scenario below asserts only the
testable half — the visible text is still correct after saving the same name again — not whether
a screen reader speaks again (see feature.md's Contract vocabulary entry "Announced", and the
precedent set by `greet-visitor`'s VERIFY-WITH-HUMAN.md VH-09/VH-10 for the same class of
question).

## Acceptance criteria

```gherkin
Scenario: Saving again replaces the previous saved name
  Given the visitor saved "Ada"
  And the visitor has since been greeted "Hello, Grace"
  When the visitor activates "Save this name"
  Then the Saved name region reads "Saved: Grace"
  And "Saved: Ada" is no longer shown

Scenario: Replacing asks nothing and offers no way back
  Given the visitor saved "Ada"
  And the visitor has since been greeted "Hello, Grace"
  When the visitor activates "Save this name"
  Then the Saved name region reads "Saved: Grace"
  And no dialog, confirmation prompt, or alert is present
  And the only buttons inside the Saved name region are "Save this name" and "Greet me again"

Scenario: Saving the same name again still replaces it
  Given the visitor saved "Ada"
  And the greeting still reads "Hello, Ada"
  When the visitor activates "Save this name" again
  Then the Saved name region still reads "Saved: Ada"
  And the "Save this name" button still has focus
```
