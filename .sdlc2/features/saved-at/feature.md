# Saved at

> Seed for the lab run against sdlc2 0.1.6. The shared understanding below was agreed in a
> grilling before the graph was invoked — it is the thing every downstream node is scored
> against.
>
> This seed **supersedes part of ADR-0034**, written during the first half of that grilling.
> That record chose to store a clock *reading* (an hour and a minute) precisely so a stamp could
> never be aged or sorted. Four requirements below need exactly that, so the instant comes back.
> ADR-0034's other half — the domain never reads the clock — still holds and is restated here.

## Capability

A visitor keeps up to five names during a visit and can already be greeted as any of them. What
the list cannot say is **when** any of it happened. After a few minutes of saving, greeting again
and removing, every row looks the same age, and the name saved thirty seconds ago is
indistinguishable from the one saved at the start.

This gives every saved name a moment, shows that moment in the words a person would actually use
("saved 3 minutes ago"), keeps that wording honest as time passes rather than freezing at whatever
it said when the row was drawn, lets the visitor put the newest first, marks which name is the
most recent, and drops names that have gone stale.

## Agreed scope

- Every saved name records **the moment it was saved** — its **saved-at moment**. It is written
  when the name joins the list, and nothing but a write to the list can change it. A tick of the
  clock never changes it.
- Each row shows an **age reading**: the saved-at moment expressed as human time relative to now —
  **"saved 3 minutes ago"**. It is derived from the moment and the current time, and is never
  stored.
- The age reading **stays current while the screen is open.** It does not freeze at the value it
  had when the row was rendered. A row drawn at "saved 1 minute ago" reads "saved 2 minutes ago"
  a minute later, with the visitor doing nothing.
- **The passage of time is never announced.** The age reading is hidden from assistive technology,
  and each row exposes a **stable absolute time** in its place. Sighted visitors watch the reading
  count up; a screen-reader user hears a time that changes only when the row itself changes.
- **Sorting newest-first is available**, through a control the visitor operates. **Oldest-first
  remains the default**, exactly as the list reads today.
- **Sorting is a view, not a reordering.** The visit goes on holding names in the order they were
  saved; the sort decides only how they are displayed. Nothing that reads the list — saving,
  removing, greeting again, the day-old cutoff, the Name field's hint — sees a sorted list.
- The **most recent** saved name carries a **marker** a visitor can perceive. Most recent means the
  latest saved-at moment.
- A saved name **older than a day falls off the list** — 24 hours from its saved-at moment, not a
  calendar boundary. It leaves on its own, with the visitor doing nothing.
- **A row falling off is a write to the list, not a tick**, so it is announced the way every other
  write to the list already is. "Time's passage is never announced" governs the words on a row; it
  does not exempt the list from reporting that it changed.
- The Name field's **saved-name hint** is untouched: it still names every saved name in list order
  and tells no times.
- Everything the list does today is unchanged — five-name limit, both refusals, greet-again,
  remove, focus behaviour, the empty state.

## Out of scope

- **Persistence.** A visit still dies at unmount. Nothing is written to web storage, and no name
  survives a reload. State this plainly because it makes the day-old cutoff **nearly unreachable
  in practice**: a name can only reach 24 hours old if the screen stays open that long. The rule is
  wanted anyway, and is built as specified.
- **Absolute dates on screen.** No row shows a date. The stable absolute time offered to assistive
  technology is a time of day, not a date.
- **Locale or timezone handling.** No `toLocaleString`, no i18n; times are the browser's local
  wall clock, formatted one fixed way. i18n remains out of scope for this repo.
- **Any sort other than by saved-at moment**, and any manual reordering by the visitor.
- **Changing what a saved name is.** Identity is still the exact string, still case-sensitive, and
  the five-name limit is untouched.

## Decisions

- **The domain never reads the clock; transport supplies it.** `src/visit.test.ts` fails the build
  if `src/visit.ts` mentions `Date`, and that token sits beside `Math.random` in the guard, not
  beside `fetch` — the rule it enforces is **determinism**, not I/O. A guard amended to let a
  feature through is not a guard. The clock is read at the impure edge and handed in.
- **What is stored is the instant, not a clock reading.** ADR-0034 chose an hour-and-minute reading
  so that a stamp *could not* be aged or sorted, and named the trigger for reversing that: anything
  needing to compare two times. All four of this feature's requirements compare two times, so its
  rejected option — store the instant, format outside the domain — is now the right one, at exactly
  the cost recorded against it: the age reading is the one visitor-facing projection that does not
  live beside the others.
- **A saved name is a record; its identity is still the name alone** (ADR-0035). The duplicate
  check, removal, the greet-again guard and the row key all compare the name and ignore the moment.
- **Sorting is derived, so it cannot corrupt the order the rules read.** Insertion order stays the
  single truth. This amends the standing rule *a row never moves once it is in the list* to **a row
  never moves unless the visitor asks it to** — moved by the visitor's own command, never under
  them while they reach for a control.
- **The saved-at moment is written only by a write to the list.** No tick, no re-render, and no
  sort can touch it.
- **The day-old cutoff is measured from the saved-at moment**, so whatever answers the open question
  below also decides when a name expires.

## Ubiquitous language

- **Saved-at moment** — the instant recorded when a name joins the list. Captured at the write,
  never by a tick.
- **Age reading** — the human-time text derived from a saved-at moment and the current time
  ("saved 3 minutes ago"). Derived on every render, never stored, never announced.
- **Stable absolute time** — the unchanging time-of-day form of the same moment, offered to
  assistive technology in the age reading's place.
- **Newest name** — the saved name with the latest saved-at moment. What the marker marks, and
  what newest-first sorting puts first.
- **Falls off** — a saved name leaving the list on its own because its saved-at moment is more than
  a day old. A write to the list, not a display rule.
- **Sort view** — the order the list is *displayed* in. Distinct from the order the visit *holds*
  names in, which never changes except by saving and removing.

## Open questions

- **When the same name is saved again, does its saved-at moment refresh to now, or keep the
  original?** Deliberately left unsettled. Whichever answer is chosen has to hold for **all three**
  consumers at once — the sort order, the newest marker, and the day-old cutoff — because all three
  read the same moment:
  - **Refresh.** Re-saving `Ada` makes Ada the newest name, moves it under newest-first sorting,
    and restarts its 24 hours. It also means a duplicate save is **no longer a refusal**: today it
    is turned away with *"Ada is already saved."* and changes nothing, and a save that silently
    refreshes a moment while claiming to have done nothing would be a lie to the visitor. Choosing
    refresh therefore obliges an answer to what the visitor is told instead.
  - **Keep.** *"Ada is already saved."* stands exactly as it is and the list is genuinely unchanged
    — but a visitor who deliberately re-saves a name to "renew" it finds that nothing happened, and
    the name falls off a day after its *first* save no matter how recently they asked for it again.
  - A third answer — refresh the moment but keep calling it a refusal — is available and should be
    argued for or ruled out explicitly rather than arrived at by accident.
- **How often the age reading refreshes**, and what it says below a minute ("just now"?
  "saved less than a minute ago"?). The wording a visitor reads for the first sixty seconds is not
  settled.
- **Whether the newest marker earns its place while newest-first sorting is on**, where the newest
  name is already the top row. It may be redundant in that view, essential in the default one.

---

# Product brief (po)

The sections above are the seed, agreed before this graph ran, and are not altered below. Every
term below is used with exactly the meaning given it in Ubiquitous language above. Everything in
this brief is `saved-at` scope; nothing here reopens `greet-visitor`, `saved-name` or
`remembered-names`, all of which this feature builds on top of. This brief is where the seed's
three **Open questions** get an answer — each is settled below, in the open, with the reasoning
that settled it, because a Gherkin scenario cannot be written against a question mark.

## Persona

**The visitor** — the one person this whole screen is for (carried unchanged from
`greet-visitor`, `saved-name` and `remembered-names`). Their job here, added to what they already
do: know **when** they saved each name, trust that what the screen says stays true the longer they
sit there, find the one they saved most recently without reading every row, choose to see the
newest first when that is what they are looking for, and never be haunted by a name they saved and
forgot about days ago.

## Epics

- **Epic A — Show when, honestly and live.** A saved name carries the moment it was saved, shown
  as an age reading that stays true while the screen is open, with a stable absolute time offered
  to assistive technology in its place. This is story 01, the walking skeleton, and it alone
  delivers the seed's headline defect fix: "every row looks the same age" stops being true.
- **Epic B — Act on the moment: spot it, order by it, let it expire.** Once every row carries a
  moment, three more things become possible and are each their own thin slice: mark the newest
  (02), let the visitor see newest-first (03), and let a stale name leave on its own (04). None of
  the three changes what a saved name *is* — only how it is found, ordered or retired.

## Decisions (product owner) — settling the seed's three open questions

These three answers are product decisions, not architecture. They were not settled in the seed on
purpose, and settling them here — rather than leaving each story to assume something different —
is exactly what "sorting, the marker and the cutoff all read the same moment" (seed, Open
questions) requires: one answer, applied consistently, everywhere that moment is read. `visit.ts`
already stores an **instant** rather than a clock reading for this feature (ADR-0034, ADR-0035);
these decisions say what happens to that instant, never how it is carried across the impure
boundary — that half is architecture's and is not reopened here.

- **Re-saving an already-saved name keeps the original saved-at moment. It does not refresh.**
  "Ada is already saved." stands exactly as it is today, unchanged, and the list is genuinely
  unchanged — not "unchanged except for a hidden field nobody sees move." Three reasons, weighed
  against the seed's own framing of the alternative:
  - **CONTEXT.md already says so.** "Saved at… is captured once, when the name joins the list, and
    the captured moment never changes afterwards" was written in the same grilling session as this
    seed. A name that is already in the list does not "join" it a second time, so under the
    glossary as written today, keep is the reading with nothing new to argue for.
  - **Refresh has a cost the seed names and does not pay for.** Choosing refresh "obliges an answer
    to what the visitor is told instead" of "Ada is already saved." — new copy, a new decision,
    with no requirement in Agreed scope asking for it. Keep pays no such cost.
  - **The third answer — refresh the moment but keep saying "already saved" — is rejected outright**,
    for the reason the seed itself gives: a save that silently moves a name's time to now while
    telling the visitor nothing happened is a lie the row would tell about itself the next time its
    age reading is read. Ruled out explicitly, as the seed asked.
  This is not a corner of the feature — it has to hold for all three consumers of the moment at
  once, so every story below that reads the moment (02, 03, 04) carries its own scenario proving
  re-saving does not move it.
- **The age reading refreshes at least once every 60 seconds while the screen is open**, unprompted
  by the visitor. This is the seed's own example, made into a rule rather than left as an
  illustration: "a row drawn at 'saved 1 minute ago' reads 'saved 2 minutes ago' a minute later."
  **Below a minute it reads "saved just now"** — the shorter of the two options the seed weighed,
  and the one closer to "the words a person would actually use" (Capability). From one minute it
  reads **"saved N minute(s) ago"** (floor of elapsed whole minutes, correct singular at exactly
  one); from sixty minutes it reads **"saved N hour(s) ago"** (floor of elapsed whole hours,
  correct singular at exactly one). It never reaches a day — the cutoff (story 04) removes the row
  first, so no age reading ever needs the word "day".
- **The newest marker is shown regardless of which sort view is active**, including when
  newest-first sorting already puts the newest row on top. One rule — "the row with the latest
  saved-at moment carries the marker" — that never changes shape depending on a control the
  visitor may or may not have touched is simpler to specify, build and check than a rule with a
  view-dependent exception, and a screen-reader user moving through the rows one at a time gets the
  same answer to "which one is newest" in either view, rather than an answer that depends on a
  control they may not have discovered. The cost is one span of text that is occasionally
  redundant with position; that is a smaller cost than a marker with two different rules.

## Agreed copy (product owner)

- Age reading: **"saved just now"** (under one minute), **"saved 1 minute ago"** / **"saved N
  minutes ago"**, **"saved 1 hour ago"** / **"saved N hours ago"**.
- Newest marker text: **"Newest"**.
- Sort control: a checkbox, accessible name **"Newest first"**. Unchecked is the default and reads
  as today's order (oldest first); checked reorders the display to newest first.

## Additional ubiquitous language (po) — new visitor-facing nouns this feature introduces

- **Newest marker** — the perceivable "Newest" label a row carries when it holds the newest name.
  Distinct from **Newest name** (seed): the newest name is a fact about the data; the newest marker
  is the on-screen sign of that fact.
- **Newest first control** — the checkbox, accessible name "Newest first", that switches the **sort
  view** (seed) between oldest-first (default) and newest-first. Operating it never touches the
  order the visit holds names in (seed, Agreed scope: "sorting is a view, not a reordering").

## What depends on what

Stated as domain facts, not as a slicing instruction — how this is cut into slices, and what
declares itself blocked by what, is the `po` node's call.

- **Every requirement here presupposes a saved-at moment existing on every saved name.** Nothing
  can be aged, sorted, marked or expired without it.
- **The age reading and the stable absolute time are one requirement, not two.** The seed pairs
  them in the same bullet ("each row exposes a stable absolute time in its place") — a sighted
  visitor's counting text and a screen-reader visitor's stable text are two faces of the same
  saved-at moment, and shipping one without the other leaves one audience with nothing.
  **This pairing is the walking skeleton.**
- **The newest marker presupposes a saved-at moment on every row**, and nothing else — it needs no
  sort control and no cutoff to be correct.
- **Sorting presupposes a saved-at moment on every row.** Testing that the marker survives sorting
  presupposes the marker already existing — so sorting's own scenarios are the natural home for
  that interaction, which is why sorting ships after the marker, not before.
- **The day-old cutoff presupposes a saved-at moment**, and — because a row that falls off may have
  been the newest row — presupposes the marker too, so the marker's re-assignment can be proven
  when the row wearing it disappears. It does not presuppose sorting: a row disappearing is correct
  in either view without a view-specific rule, so no scenario needs the sort control to exist.

## Story map

Backbone — the visitor's path through a visit where saved names carry a moment, left to right:

| Save a name | Read a row | Read a row without sight | Spot the newest | Choose the order | Let time do the rest |
|---|---|---|---|---|---|
| Saved-at moment captured, silently | Age reading, live | Stable absolute time, in the age reading's place | Newest marker | Newest-first control (oldest-first default, unchanged) | Falls off after a day |
| *(01)* | *(01)* | *(01)* | *(02)* | *(03)* | *(04)* |
| | | | Marker moves as saves happen *(02)* | Marker survives sorting *(03)* | Marker moves on when its row falls off *(04)* |
| | | | Re-save never moves it *(02)* | Re-save never reorders it *(03)* | Re-save never restarts its clock *(04)* |

**Walking skeleton — story 01, alone.** It is the seed's own capability statement in miniature:
"gives every saved name a moment, shows that moment in the words a person would actually use…
keeps that wording honest as time passes rather than freezing." Capturing the moment with nothing
shown proves nothing a visitor can see; showing a reading that freezes at render time is the exact
defect the seed opens with ("every row looks the same age"). Only a moment that is captured, shown
in words, kept alive unprompted, **and** offered as a stable time to assistive technology — all
four together — demonstrates the core promise. Marking, sorting and expiring are all things a
visitor does or benefits from **after** that promise is visibly kept; none of them is needed to
prove it.

**Later slices deepen the backbone**, in the order they ship:
- 02 (Spot the newest) — the marker. Needs only 01.
- 03 (Choose the order) — the newest-first control. Needs 01, and needs 02 so its own "marker
  survives sorting" scenario has a marker to check.
- 04 (Let time do the rest) — the day-old cutoff. Needs 01, and needs 02 so its own "marker moves
  on" scenario has a marker to check. Does not need 03 — a row disappearing is correct under
  either sort view without a view-specific rule.

## User stories

### 01 — Every saved name shows when it was saved, and the reading stays honest (walking skeleton)

As a **visitor with one or more saved names**,
I want each row to show, in words, how long ago I saved it — and to keep that wording true while I
sit here, not freeze at whatever it said when the row first appeared,
so that I can tell my most recent save from one I made minutes ago without doing any arithmetic
myself.

```gherkin
Scenario: A newly saved name reads "saved just now"
  Given the visitor has been greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the row for "Ada" shows the age reading "saved just now"

Scenario: The age reading counts up in minutes, unprompted, while the screen stays open
  Given the visitor saved "Ada" and the row for "Ada" reads "saved just now"
  When 60 seconds pass with the visitor doing nothing
  Then the row for "Ada" shows the age reading "saved 1 minute ago"
  When another 60 seconds pass with the visitor doing nothing
  Then the row for "Ada" shows the age reading "saved 2 minutes ago"

Scenario: The age reading moves from minutes to hours after sixty minutes
  Given the visitor saved "Ada" and the row for "Ada" reads "saved just now"
  When 60 minutes pass with the visitor doing nothing
  Then the row for "Ada" shows the age reading "saved 1 hour ago"

Scenario: Two rows' age readings are independent
  Given the visitor saved "Ada", then 2 minutes later saved "Bob"
  Then the row for "Ada" shows the age reading "saved 2 minutes ago"
  And the row for "Bob" shows the age reading "saved just now"

Scenario: The age reading is hidden from assistive technology; a stable absolute time takes its place
  Given the visitor saved "Ada"
  Then the row for "Ada" has an accessible name that includes a stable absolute time
  And the row for "Ada" has an accessible name that does not include the words "ago" or "just now"
  When 5 minutes pass with the visitor doing nothing
  Then the row for "Ada"'s accessible name still includes that same stable absolute time, unchanged

Scenario: Re-saving an already-saved name does not restart its age reading
  Given the visitor saved "Ada" 10 minutes ago
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Ada is already saved."
  And the row for "Ada" still shows the age reading "saved 10 minutes ago"

Scenario: An empty list shows no age reading at all
  Given the visitor has not saved any name
  Then the Saved names region reads "No names saved yet."
  And no text reading "ago" is present
```

### 02 — The most recently saved name is marked

As a **visitor with more than one saved name**,
I want the row I saved most recently to carry a marker I can see,
so that I can find it at a glance instead of comparing every row's age reading myself.

```gherkin
Scenario: The one saved name carries the marker
  Given the visitor has saved "Ada" only
  Then the row for "Ada" shows the label "Newest"

Scenario: Saving a second name moves the marker to it
  Given the visitor has saved "Ada" only, and the row for "Ada" shows the label "Newest"
  When the visitor saves "Bob"
  Then the row for "Bob" shows the label "Newest"
  And the row for "Ada" no longer shows the label "Newest"

Scenario: Exactly one row carries the marker at a time
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  Then exactly one row shows the label "Newest"
  And it is the row for "Cleo"

Scenario: Removing the newest saved name moves the marker to the next-newest
  Given the visitor has saved "Ada" and "Bob", in that order
  And the row for "Bob" shows the label "Newest"
  When the visitor activates "Remove Bob"
  Then the row for "Ada" shows the label "Newest"

Scenario: Re-saving an older name does not move the marker to it
  Given the visitor has saved "Ada" and "Bob", in that order
  And the row for "Bob" shows the label "Newest"
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Ada is already saved."
  And the row for "Bob" still shows the label "Newest"
  And the row for "Ada" does not show the label "Newest"

Scenario: No marker is shown when nothing is saved
  Given the visitor has not saved any name
  Then no text reading "Newest" is present
```

### 03 — Sort the list newest-first

As a **visitor with more than one saved name**,
I want to switch the Saved names list to show the newest name first,
so that I can see my most recent saves without hunting for the marker among rows in save order.

```gherkin
Scenario: Oldest-first is the default, exactly as the list reads today
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  Then the Saved names region displays rows in the order "Ada", "Bob", "Cleo"
  And a checkbox named "Newest first" is present and unchecked

Scenario: Checking "Newest first" reorders the display
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  When the visitor checks "Newest first"
  Then the Saved names region displays rows in the order "Cleo", "Bob", "Ada"

Scenario: Unchecking "Newest first" returns to oldest-first
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor has checked "Newest first"
  When the visitor unchecks "Newest first"
  Then the Saved names region displays rows in the order "Ada", "Bob"

Scenario: Sorting is a view — the hint still lists names in save order, not display order
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  And the visitor has checked "Newest first"
  Then the Name field is described by text reading "Saved: Ada, Bob, Cleo"

Scenario: Removing a row while newest-first sorting is on removes the correct name and re-derives both views
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  And the visitor has checked "Newest first", so rows display "Cleo", "Bob", "Ada"
  When the visitor activates "Remove Bob"
  Then the Saved names region displays rows in the order "Cleo", "Ada"
  And the Name field is described by text reading "Saved: Ada, Cleo"

Scenario: A newly saved name appears first while newest-first sorting is on
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor has checked "Newest first"
  When the visitor saves "Cleo"
  Then the Saved names region displays rows in the order "Cleo", "Bob", "Ada"

Scenario: The newest marker is shown even though newest-first sorting already puts it on top
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor has checked "Newest first"
  Then the row for "Bob" shows the label "Newest"

Scenario: Re-saving an older name reorders nothing, under either view
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region displays rows in the order "Ada", "Bob"
  When the visitor checks "Newest first"
  Then the Saved names region displays rows in the order "Bob", "Ada"

Scenario: The sort control is absent while nothing is saved
  Given the visitor has not saved any name
  Then no checkbox named "Newest first" is present
```

### 04 — A saved name older than a day falls off on its own

As a **visitor whose visit has been open a long time**,
I want a name I saved more than a day ago to leave the list on its own,
so that the list stays a record of names I still care about, not everything I have ever typed.

```gherkin
Scenario: A saved name falls off once more than a day has passed since it was saved
  Given the visitor saved "Ada"
  When more than 24 hours pass with the visitor doing nothing
  Then no row for "Ada" is present
  And the Saved names region's contents are announced

Scenario: A saved name does not fall off before a day has passed
  Given the visitor saved "Ada"
  When 23 hours and 59 minutes pass with the visitor doing nothing
  Then the row for "Ada" is still present

Scenario: The cutoff is measured from the saved-at moment, not a calendar boundary
  Given the visitor saved "Ada" at 23:50
  When 20 minutes pass with the visitor doing nothing, crossing midnight
  Then the row for "Ada" is still present

Scenario: Falling off does not move focus, unlike the visitor's own removal
  Given the visitor's focus is currently on the Name field
  And the visitor saved "Ada" earlier in the visit
  When more than 24 hours pass with the visitor doing nothing
  Then the Name field still has focus

Scenario: Falling off frees a slot for another save, exactly like removing does
  Given the visitor has saved five names, the oldest being "Ada", saved more than 24 hours ago
  And the other four were saved less than 24 hours ago
  When enough time passes that "Ada" falls off the list
  And the visitor has been greeted "Hello, Fay"
  And the visitor activates "Save this name"
  Then the Saved names region contains a row for "Fay"

Scenario: The newest marker moves on when the row wearing it falls off
  Given the visitor saved "Ada", then 23 hours later saved "Bob"
  And the row for "Bob" shows the label "Newest"
  When enough time passes that "Ada" is more than 24 hours old and "Bob" is not
  Then no row for "Ada" is present
  And the row for "Bob" still shows the label "Newest"

Scenario: Re-saving an already-saved name does not restart its 24-hour clock
  Given the visitor saved "Ada" 20 hours ago
  And the visitor is currently greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region reads "Ada is already saved."
  When 4 more hours pass with the visitor doing nothing
  Then no row for "Ada" is present
```

## Out of scope (product owner confirmation)

Everything the seed's own **Out of scope** section excludes is confirmed excluded by every story
above — no story, screen or scenario reintroduces any of it:

- **Persistence.** No scenario above asserts a storage write; nothing here changes the existing
  `never writes to web storage` constraint or the fresh-visit guard. Story 04's 24-hour scenarios
  are exercised with the visit held open under a controlled clock, exactly as the seed says is
  "nearly unreachable in practice" — the rule is still built and still tested, in memory, for the
  duration a fake clock can simulate.
- **Absolute dates on screen.** No scenario asserts a date; the stable absolute time in story 01 is
  a time only, and story 04 removes a row rather than ever labelling it with a date it has crossed.
- **Locale or timezone handling.** No scenario names a locale or a timezone; every time in a
  scenario is the visitor's own local wall clock, and the exact display format of the stable
  absolute time (the seed: "formatted one fixed way") is left to architecture/ux to fix once,
  consistently — no story pins a specific string for it.
- **Any sort other than by saved-at moment, and any manual reordering.** Story 03's control has one
  job — oldest-first or newest-first — and no scenario anywhere accepts a drag, a manual move, or a
  sort by any field but the saved-at moment.
- **Changing what a saved name is.** Identity is still the name alone (ADR-0035); every "already
  saved" scenario above is the same refusal the visitor already knows, unchanged in wording.
- **How the clock reaches the domain (ADR-0034), and the record shape of a saved name (ADR-0035).**
  Both are architecture decisions already taken and not reopened here. No scenario above asserts an
  implementation detail of either — only the visitor-observable behaviour they make possible.
- **The exact accessibility technique used to hide the age reading from assistive technology and
  expose the stable absolute time in its place** (e.g. which element carries `aria-hidden`, which
  carries the description). Story 01 fixes the observable outcome — an accessible name that carries
  the stable time and not the words "ago" / "just now" — and leaves the markup that produces it to
  architecture/ux.
- **Visual placement and styling of the marker and the sort control.** Story 02 and 03 fix the
  marker's text ("Newest") and the control's accessible name ("Newest first"); where on the row or
  in the region either sits is `ux`'s call, not fixed here.
- **Refresh, and the hybrid "refresh but still call it a refusal".** Both are explicitly ruled out
  above (Decisions). No story's Gherkin ever has a re-save changing an age reading, a marker, a
  sort position, or the 24-hour cutoff.
- Everything the existing screen already does and this feature does not touch: the five-name limit,
  the full-list refusal, greet-again, manual removal and its focus rule, and the empty state, all
  exactly as `remembered-names` left them. No story above changes any of their existing scenarios;
  where a saved-at concern interacts with one of them (falling off frees a slot, exactly like
  removing does), that interaction is the only thing under test, not the underlying rule itself.
