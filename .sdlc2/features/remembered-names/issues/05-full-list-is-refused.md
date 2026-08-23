# 05 — Saving while the list is full is refused, and removing is the way out

Blocked by: 01-hold-more-than-one-saved-name and 03-remove-a-saved-name. The refusal itself only
needs a list that can be full (01), but per feature.md's "What depends on what", the limit's
escape hatch presupposes removing: the refusal's own copy tells the visitor to remove a name, so
the refusal and removing are only jointly demonstrable once removing exists. Not blocked by
02-greet-again-as-any-saved-name or 04-already-saved-is-refused — neither is exercised by these
scenarios; 04 and 05 are siblings, both unblocked once 01 (and, for 05, 03) land, built in numeric
order because that is the agreed release order (feature.md, Story map), not because 05 needs 04's
state.

Dir: src/

## Story

As a **visitor whose visit already holds five names**,
I want to be told the list is full and how to make room,
so that I understand why saving did nothing and what to do about it.

Deepens the "Save" backbone step with its second refusal path (feature.md, Story map). Per the
seed's Decisions: five is a bound that keeps the field's description a sentence rather than an
unbounded recital; refusing rather than silently dropping the oldest name is the only ending
consistent with the visitor choosing what is remembered. The save control stays visible when the
list is full — hiding it would teach nothing and would vanish mid-visit with no explanation.

## Acceptance criteria

```gherkin
Scenario: Saving a sixth name is refused and says so
  Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
  And the visitor has been greeted "Hello, Fay"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Five names is the limit. Remove one to save another."
  And the Saved names region still contains exactly the rows "Ada", "Bob", "Cleo", "Deb" and "Eve", in that order

Scenario: The refusal does not drop the oldest saved name to make room
  Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
  And the visitor has been greeted "Hello, Fay"
  When the visitor activates "Save this name"
  Then a row for "Ada" is still present

Scenario: The save control remains visible when the list is full
  Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
  And the visitor has been greeted "Hello, Fay"
  Then a button named "Save this name" is present

Scenario: Removing a name frees the slot the limit refusal warned about
  Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
  And the visitor has been greeted "Hello, Fay" and the save was refused with "Five names is the limit. Remove one to save another."
  When the visitor activates "Remove Bob"
  And the visitor activates "Save this name"
  Then the Saved names region contains rows for "Ada", "Cleo", "Deb", "Eve" and "Fay", in that order

Scenario: Four saved names do not trigger the limit refusal
  Given the visitor has saved four names: "Ada", "Bob", "Cleo" and "Deb"
  And the visitor has been greeted "Hello, Eve"
  When the visitor activates "Save this name"
  Then the Saved names region contains a row for "Eve"
  And no text "Five names is the limit. Remove one to save another." is present
```
