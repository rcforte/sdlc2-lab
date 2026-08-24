# Undo a removal

> Seed for the lab run against sdlc2 0.1.8. The shared understanding below was agreed in a
> grilling before the graph was invoked — it is the thing every downstream node is scored
> against.
>
> Two of its decisions were hard enough to reverse to be written down as they were settled:
> ADR-0042 (the entry comes back whole) and ADR-0043 (the offer ends rather than refuses).

## Capability

A visitor keeps up to five names during a visit, and every row carries a control that takes one
of them away. That control is the last thing on the row, one tab-stop past *"Greet me again as
Ada"* — deliberately, so nobody reaching for the greeting lands on it — but a mis-press is still
a mis-press, and today it is final. The row is gone, the moment it was saved is gone with it, and
the only way back is to retype the name, greet as it, and save it again: three steps to repair one
press, and the restored name is then a different saved name to every part of the screen that reads
moments.

This gives the screen a memory one removal deep. After a removal, it offers to bring that name
back — the same name, the same moment, the same place in the list — so that taking back a mistake
is one press, and the list afterwards is the list that was there before.

## Agreed scope

- A **removal** the visitor performs leaves an offer to bring that name back. Only a removal the
  visitor asked for: a name that falls off after a day is not a removal, and there is nothing to
  take back.
- Only the **most recent** removal can be undone, and only **within the same visit**. Each removal
  replaces the offer left by the one before it. At most one name is ever waiting to come back —
  no history, no stack.
- The name comes back **whole**: the same text, the same **saved-at moment** it already had, and
  the same **place in the list** it held. The list afterwards reads exactly as it did before the
  removal — same order, same age readings, same Newest marker.
- The offer **stands until something ends it.** It does not time out. A removal noticed a minute
  later is still a removal the visitor wants back.
- The offer **ends when the list moves.** It stands only while the list is exactly as the removal
  left it: another removal replaces it, and any other write to the list — a save, or a name
  falling off — ends it. So the offer is either present and certain to work, or absent. It never
  refuses.
- The held name **ages like the rest.** Once its saved-at moment is more than a day old, the offer
  goes with it, rather than bringing back a name the day-old rule would drop seconds later.
- The offer is **one control inside the Saved names region**, between the heading and the rows —
  where the refusal message already sits. It **names the name**: *"Bring Ada back"*, so a visitor
  who cannot see the row that vanished is still told what will return.
- Bringing a name back is **a write to the list**, so it is announced the way every write to the
  list already is, and it clears a standing refusal the way every write to the list already does.
- Pressing the offer **destroys the control that was pressed**, so focus goes to the **Saved names
  region** — exactly what a removal already does. The region then announces the list with the name
  back in it.
- Removing the **last** name shows the empty state *and* the offer: nothing is saved, which is
  true, and the way back is right there. The sort control stays absent, because there is still no
  order to choose between.
- The **five-name limit is never at risk** on this path, and not because anything checks it: the
  removal freed exactly one slot, and any save since would have ended the offer.
- Everything else is unchanged — the limit, both save refusals, greeting again, removing, the
  newest-first sort, the Newest marker, the day-old fall-off, and the Name field's hint (which
  names the list, so a name brought back reappears in it, in its own place).
- The **greeting is untouched.** Removing never changed who the visitor is greeted as, and
  bringing a name back does not either.

## Out of scope

- **Redo.** There is no undoing the undo. Once the name is back, the offer is spent; removing it
  again is a new removal and starts a new offer.
- **A keyboard shortcut.** No Ctrl+Z, no global key handler. The offer is a control the visitor
  activates. Nothing on this screen listens for keys outside a field today, and this feature does
  not start.
- **Undoing anything but a removal.** A save, a greeting and a blank submission stay final.
- **Undoing a fall-off.** A name that leaves on its own is not offered back. The visitor activated
  nothing, so nothing was taken from them by mistake.
- **Persistence.** A visit still dies at unmount. No offer survives a reload, and nothing is
  written to web storage. As with the day-old cutoff, this makes the ageing rule above nearly
  unreachable in practice; it is wanted anyway and is built as specified.
- **Any message about the offer ending.** When it ends the control is simply absent on the next
  render, the way the Save button and the sort control are already absent when there is nothing
  for them to do. Nothing is said, nothing is announced.

## Decisions

- **Only a pressed removal is undoable.** The glossary already separates a removal from a name
  that *falls off*: one is the visitor's act, the other is the clock's. Undo exists for mistakes,
  and the clock does not make them.
- **The name comes back with its original moment, in its original place** (ADR-0042). A fresh
  moment would make undo a re-save — the row would read *"saved just now"*, steal the Newest
  marker from a name that genuinely is newer, and jump to the top of the newest-first view. The
  visitor asked to take back a removal, not to make a save. Appending it instead of restoring its
  place was the near miss: a name carrying an old moment sitting last would make the default view
  and the newest-first view contradict each other about which row is older.
- **The offer ends when the list moves; it never refuses** (ADR-0043). This deviates from the
  house pattern on purpose. `save` refuses in words because its refusals teach rules the visitor
  will meet again — five is the limit, this name is already saved. An undo refusal would only
  report that the visitor moved the list on themselves, deliberately, a moment ago. One rule ("the
  list is as the removal left it") replaces three checks, and the cost is named: remove Ada, save
  Bob, change your mind, and Ada must be retyped.
- **The held name ages.** It keeps its own moment, so its own moment can pass the day-old cutoff.
  Bringing back a name that vanishes on the next tick would read as the control doing nothing, and
  would announce the region twice for one press.
- **The offer stands rather than counting down.** A countdown would put a second thing on the
  clock's tick — the tick that ages rows would also have to retire an offer — and would take the
  control away mid-reach from anyone navigating with a screen reader. The one clock-driven change
  on this screen is deliberately silent, and it stays that way.
- **The offer names its name.** The row controls already do (*"Remove Ada"*, *"Greet me again as
  Ada"*) because identical labels are indistinguishable to anyone not looking. There is only ever
  one offer, so ambiguity is not the reason here; after a mis-press, *what is coming back* is the
  question the visitor actually has.
- **Focus goes to the region, as it already does after a removal.** One rule for the screen rather
  than two: a control that destroys itself by being pressed sends focus to the region, which then
  announces the result. Sending focus into the restored row would land the visitor one tab-stop
  from the Remove control that started this.
- **The memory belongs to the visit, not to the screen.** The sort preference is screen state
  because sorting is a view of the list. This is not a view: it drives a write to the list, it
  must be exact across re-renders, and its own rules (replace, end, age) are rules about the list.
  It is a field of the visit like the saved names themselves, written by whatever already owns
  writes to the list, so the offer and the list can never disagree.

## Ubiquitous language

- **Removal** — a saved name leaving the list because the visitor asked for it. Contrast **falls
  off**: the same disappearance, no visitor, and not undoable.
- **Last removal** — the one removal a visit is still offering to take back. At most one per
  visit. It remembers the saved name that left — text and saved-at moment — and the place it held.
- **Bringing back** — putting the last removal's saved name into the list again: same text, same
  moment, same place. A write to the list, never a new save.
- **The offer** — what the screen shows while there is a last removal: the single control that
  brings the name back.

## Open questions

- **The exact words on the control.** *"Bring Ada back"* is agreed as the shape and is what the
  grilling settled. Whether it still reads well for an unusual saved name — a name with trailing
  punctuation, or a whole sentence a visitor typed — is a human judgement, not something a test
  can settle.
- **Whether the offer is actually perceived when it arrives.** It appears inside a polite live
  region that the removal has just given focus to, which is the same class of question as the
  existing human checks on announcement: no jsdom test can observe it, and only a real screen
  reader can answer it.
- **The offer's placement relative to the sort control.** It sits above both the sort checkbox and
  the rows, matching where the refusal message already goes. Whether a visitor reads that order
  the way it is intended, with two controls stacked above the list, is worth one look at the real
  screen.

---

# Product brief (po)

The sections above are the seed, agreed before this graph ran, and are not altered below. Every
term below is used with exactly the meaning given it in Ubiquitous language above. Everything in
this brief is `undo-a-removal` scope; nothing here reopens `greet-visitor`, `saved-name`,
`remembered-names` or `saved-at`, all of which this feature builds on top of and all of which are
already merged into `src/`.

## Persona

**The visitor** — the one person this whole screen is for (carried unchanged from
`greet-visitor`, `saved-name`, `remembered-names` and `saved-at`). Their job here, added to what
they already do: recover instantly from a mis-press on a Remove control, without losing the
moment or the place the name held, and without that recovery ever costing more than the one press
that broke it.

## Epics

- **Epic A — Undo the last removal, whole.** A removal leaves a named, workable offer; pressing it
  restores the entry exactly as it was — same text, same saved-at moment, same place — and leaves
  the rest of the screen (the greeting, every other row, the limit) untouched. This is story 01,
  the walking skeleton: an offer nobody can press proves nothing, and a restore with no offer to
  press does not exist, so the two ship together.
- **Epic B — The offer keeps its promise or gets out of the way.** Once the offer exists, two more
  things make it trustworthy rather than merely present: it stands only while the list is exactly
  as the removal left it (story 02), and it stands only while the held name itself is not yet a day
  old (story 03). Neither changes what bringing a name back *does* — only when the control is there
  to be pressed at all.

## Decisions (product owner) — settling what the seed leaves open

The seed decides *that* the offer ends when the list moves and *that* it never refuses (ADR-0043).
It does not decide one boundary case: **whether a refused save attempt counts as "the list moving."**
Left unsettled, half of story 02's scenarios and the seed's own "clears a standing refusal" bullet
could not be written as a test, so it is settled here, not re-argued at the seed's level.

- **A refused save (`already-saved` or `full`) does not end the offer. Only a successful save — one
  that actually adds a row — ends it, exactly as a fall-off does.** Three reasons:
  - **The seed's own examples are both content-changing.** ADR-0043's Context gives two cases for
    "the list can move": saving a fifth name (adds a row) and re-saving the removed name itself
    (also adds a row, since the removed entry is no longer in the list to collide with). Neither
    example is a refusal that changes nothing.
  - **A refusal, by definition, leaves the list's actual contents untouched** — no row added, moved
    or removed. The restore that the offer promises is still exactly as valid after a refusal as it
    was before it. Ending the offer over an event that changed nothing would be the seed's own
    "never refuses" clause, defeated by an unrelated word: no message would appear, but the offer
    would vanish anyway, for no reason the visitor could see, having done nothing to the list.
  - **It is the only reading under which "bringing a name back clears a standing refusal" (seed,
    Agreed scope) can ever be exercised.** If any refusal also ended the offer, a refusal and a live
    offer could never coexist, and that bullet would describe a state that can never be reached —
    which would make it dead prose rather than a rule. Story 02's scenario proving the offer
    survives a refusal, and is then pressed to clear it, is what keeps that seed bullet real.
- **The five-name limit is structurally never at risk on the bring-back path** (seed, Agreed scope),
  and it is worth being explicit about *why*, since no code checks it: reaching a full list again
  while an offer stands would require a successful save, and a successful save already ends the
  offer (above). So a "full" refusal and a live offer can never coexist either — story 01 proves the
  boundary case directly (removing the fifth name, then bringing it straight back) rather than
  arguing the structural point in prose alone.
- **The offer never produces a refusal of its own** (seed, Decisions, ADR-0043): no scenario below
  ever has pressing the offer fail, time out, or say why it could not act. It is either present and
  certain to work, or the button is not there — the seed's own words, made literal in every
  scenario's Given/When/Then.

## Additional ubiquitous language (po)

- **The held entry** — the term ADR-0042 and ADR-0043 already use for what the last removal
  remembers: the removed saved name, its own saved-at moment, and the position it held. Carried
  from those two ADRs rather than coined here, so a reader moving between the ADRs and this brief
  finds one term, not two.

No other new visitor-facing noun is introduced: **the offer**, **removal**, **last removal** and
**bringing back** are all already defined in the seed's own Ubiquitous language above, and every
story below uses them with exactly that meaning.

## What depends on what

Stated as domain facts, not as a slicing instruction — how this is cut into slices, and what
declares itself blocked by what, is the `po` node's call.

- **Everything here presupposes the existing removal, saved-at moment and day-old fall-off**, all
  merged from `remembered-names` and `saved-at`. There is nothing to offer back without a removal,
  and nothing to restore "whole" without a moment and a position to restore it to.
- **The offer appearing and bringing the name back are one requirement, not two.** An offer nobody
  can press proves nothing a visitor benefits from; a restore control with no offer to press does
  not exist. **This pairing is the walking skeleton (story 01).**
- **The offer's lifecycle — replaced by the next removal, ended by a successful save or a fall-off,
  surviving everything else (story 02) — presupposes the offer already exists (01).** There is
  nothing to end or replace until 01 ships.
- **The held entry ageing out (story 03) presupposes the offer already exists (01)** and reuses the
  day-old cutoff `saved-at` already defined for visible rows. It does not presuppose 02: the ageing
  rule fires on its own schedule whether or not any other write has happened in the meantime.

## Story map

Backbone — the visitor's path through a mis-pressed removal, left to right:

| Remove a name | The offer appears | Bring it back | Keep working, offer standing | Time passes |
|---|---|---|---|---|
| *(existing, carried — `remembered-names`)* | Named control, between the heading and the rows, even from an emptied list | Entry restored whole: same text, same moment, same place; a write to the list; clears a refusal; focus to the region | Replaced by the next removal; ended by a successful save or a fall-off; survives a refused save, a sort toggle, greeting again, a blank submission | The held entry ages like the rest; the offer goes, silently, once it turns a day old |
| | *(01)* | *(01)* | *(02)* | *(03)* |
| | Never appears for a fall-off *(01)* | Never overfills the list, even from five *(01)* | The offer never times out on its own *(02)* | A restored entry keeps ageing from its original moment *(03)* |

**Walking skeleton — story 01, alone.** It is the seed's own capability statement in miniature:
"after a removal, it offers to bring that name back — the same name, the same moment, the same
place in the list — so that taking back a mistake is one press." An offer that appears but cannot
be pressed, or a restore with nothing to press, proves neither half of that sentence. Only the pair
— named offer, whole restore, right place, right focus, greeting untouched, working even from an
empty list or a full one — demonstrates the core promise. The offer's lifecycle (02) and its ageing
(03) are both about **when the control in 01 is there to be pressed at all**; neither changes what
pressing it does, which is why both ship after it.

**Later slices deepen the backbone**, in the order they ship:
- 02 (Keep working, offer standing) — needs only 01: there is nothing to replace, end, or let
  survive until an offer exists to test those things against.
- 03 (Time passes) — needs only 01, for the same reason. It does not need 02: the held entry's own
  clock runs whether or not any list-moving event has happened since the removal.

## User stories

### 01 — Bring back the last removed name (walking skeleton)

As a **visitor who just removed a saved name by mistake**,
I want a control that names the name I removed and offers to bring it back exactly as it was,
so that undoing a mis-press costs one press instead of retyping the name, greeting as it, and
saving it again.

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

### 02 — The offer holds only while the list is exactly as the removal left it

As a **visitor whose removal is being offered back**,
I want the offer to disappear the moment anything happens that would make bringing the name back
wrong, and to keep working through everything that would not,
so that pressing it is always either certain to work or simply not there — never a guess about
what it will do.

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

### 03 — The held entry ages like the rest

As a **visitor who removed a name and left the offer standing**,
I want the offer to quietly stop being available once the name it would bring back is more than a
day old,
so that I am never handed a name back only to watch it vanish again moments later.

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

## Out of scope (product owner confirmation)

Everything the seed's own **Out of scope** section excludes is confirmed excluded by every story
above — no story, screen or scenario reintroduces any of it:

- **Redo.** Story 02's last scenario proves a spent offer does not return on its own, and that
  removing the same name again starts a brand-new offer rather than reviving the old one. No
  scenario anywhere lets a "Bring back" itself be undone.
- **A keyboard shortcut.** Every scenario above activates the offer as a named button, exactly like
  every other control on this screen. No scenario presses a key, and none asserts a global key
  handler exists.
- **Undoing anything but a removal.** No scenario offers to undo a save, a greeting, or a blank
  submission. Story 02's refusal scenario proves the offer is not even touched by a refused save,
  let alone offered as a way to undo one.
- **Undoing a fall-off.** Story 01's last scenario proves a name that leaves on its own is never
  offered back.
- **Persistence.** No scenario asserts a storage write or a page reload; every "N hours/minutes
  pass" scenario is exercised with the visit held open under a controlled clock, exactly as
  `saved-at`'s own day-old scenarios already are.
- **Any message about the offer ending.** Story 03's second scenario explicitly asserts silence —
  no text anywhere reading "Bring Ada back" or reporting that it ended — never an announcement.
- **How the offer is tracked internally, and the exact markup/technique for its placement between
  the heading and the rows.** Story 01 fixes the observable outcomes — the button exists, is named
  for the name, and precedes the first row — and leaves the mechanism (e.g. whether it is a field of
  the visit or derived) to architecture, exactly as the seed's own Decisions section already assigns
  "the memory belongs to the visit" as a fact about where the rule lives, not about DOM structure.
- **The exact words on the control for an unusual saved name**, and **whether the offer is
  perceived on arrival by a real screen reader**, and **the offer's placement relative to the sort
  control being read in the intended order** — all three are the seed's own **Open questions**
  above, unresolved on purpose, and are not settled by any story here. No scenario above pins
  wording for a name with punctuation or unusual content, and no scenario asserts anything a jsdom
  test cannot see about live-region perception or reading order beyond DOM position (which the
  "sits between the heading and the rows" scenario in story 01 does cover).
