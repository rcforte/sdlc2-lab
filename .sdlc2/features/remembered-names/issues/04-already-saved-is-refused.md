# 04 — Saving a name already saved is refused

Blocked by: 01-hold-more-than-one-saved-name — the refusal needs a list that can already contain
the name being saved. Not blocked by 02 or 03: per feature.md's "What depends on what", the
refusals presuppose saving and nothing else — neither needs removing, and neither needs the hint.

Dir: src/

## Story

As a **visitor who saves the same name a second time**,
I want to be told the name is already saved, with the list left exactly as it was,
so that I know my press did something, and I never see two rows for the same name.

Deepens the "Save" backbone step with its first refusal path (feature.md, Story map). Per the
seed's Decisions: a saved name is an identity, not an event — a second Ada would mean two
identical rows the visitor cannot tell apart, and moving Ada to the front would rearrange the
list under someone reaching for a control. The refusal still says something, because a button
that appears to do nothing is the silence this codebase has twice designed against.

## Acceptance criteria

```gherkin
Scenario: Saving a name already in the list changes nothing and says so
  Given the visitor has saved "Ada" only
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Ada is already saved."
  And the Saved names region contains exactly one row for "Ada"

Scenario: The already-saved refusal does not reorder the list
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region contains rows for "Ada", "Bob" and "Cleo", in that order

Scenario: The already-saved refusal is announced through the same polite live region
  Given the visitor has saved "Ada" only
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region still has the attribute aria-live="polite"

Scenario: Saving a name not yet saved still succeeds while another name is already saved
  Given the visitor has saved "Ada" only
  And the visitor has been greeted "Hello, Bob"
  When the visitor activates "Save this name"
  Then the Saved names region contains a row for "Ada" and a row for "Bob"

Scenario: The save control remains after an already-saved refusal
  Given the visitor has saved "Ada" only
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then a button named "Save this name" is still present
```
