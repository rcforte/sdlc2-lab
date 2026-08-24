# 03 — The held entry ages like the rest

Blocked by: 01-bring-back-the-last-removed-name (the offer must exist before it can age out; this
issue reuses the day-old cutoff `saved-at` already defines for visible rows). Does not depend on
02 — the held entry's own clock runs whether or not any list-moving event has happened since the
removal.

Dir: src/

## Story

As a **visitor who removed a name and left the offer standing**,
I want the offer to quietly stop being available once the name it would bring back is more than a
day old,
so that I am never handed a name back only to watch it vanish again moments later.

The held entry keeps the saved-at moment it already had (ADR-0042) rather than a fresh one, which
means its own 24-hour clock keeps running while it waits to be offered back. This issue is what
keeps that consistent with `saved-at`'s day-old rule for every visible row: the ending is silent
(seed, Out of scope — "any message about the offer ending"), and a restored entry keeps counting
from its original moment, not from the moment it came back.

## Acceptance criteria

```gherkin
Scenario: The offer still stands just short of a day
  Given the visitor saved "Ada" 23 hours and 55 minutes ago
  And the visitor activated "Remove Ada" just now, so a button named "Bring Ada back" is present
  When 4 more minutes pass with the visitor doing nothing
  Then a button named "Bring Ada back" is still present

Scenario: The offer goes, silently, once the held entry turns a day old
  Given the visitor saved "Ada" 23 hours and 55 minutes ago
  And the visitor activated "Remove Ada" just now, so a button named "Bring Ada back" is present
  When 6 more minutes pass with the visitor doing nothing
  Then no button named "Bring Ada back" is present
  And no text reading "Bring Ada back" is present anywhere on screen

Scenario: A name brought back keeps ageing from its original moment, not from when it came back
  Given the visitor saved "Ada" 23 hours and 50 minutes ago
  And the visitor activated "Remove Ada" just now, so a button named "Bring Ada back" is present
  When the visitor activates "Bring Ada back"
  Then the Saved names region contains a row for "Ada"
  When 15 more minutes pass with the visitor doing nothing
  Then no row for "Ada" is present

Scenario: The held entry ageing out disturbs nothing else on screen
  Given the visitor saved "Ada" 23 hours and 55 minutes ago, then saved "Bob" just after
  And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
  When 6 more minutes pass with the visitor doing nothing
  Then no button named "Bring Ada back" is present
  And the Saved names region contains a row for "Bob"
```
