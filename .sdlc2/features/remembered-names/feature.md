# Remembered names

> Seed for the lab run against sdlc2 0.1.4. The shared understanding below was agreed in a
> grilling before the graph was invoked — it is the thing every downstream node is scored
> against.

## Capability

During a visit, a visitor can keep several names — up to five — and be greeted as any of them
without retyping. Today the visit holds exactly one saved name, so saving a second throws the
first away without saying so, and a visitor who moves between two or three names is back to
retyping the ones they lost. This gives the visit a small, ordered set of names it holds onto
deliberately, a way to be greeted as any one of them, and a way to drop one that was a mistake.

## Agreed scope

- The visit holds **up to five saved names**, in the order they were saved, oldest first.
- Saving appends **the name the visitor is currently greeted as** to the end of the list — never
  what is typed in the Name field. A saved name never moves once it is in the list.
- Saving a name **already in the list** leaves the list unchanged and says so:
  **"Ada is already saved."** No second entry, no reordering.
- Saving while the list already holds **five** names is **refused**, and says so: **"Five names is
  the limit. Remove one to save another."** Nothing is saved and nothing is dropped.
- The **Saved names** region sits on the greeting screen, below the greeting status region, headed
  **"Saved names"**. It is present from the first render.
- While nothing is saved the region says so in words: **"No names saved yet."**
- Each saved name is a **row** in the region, carrying the name and two controls:
  **"Greet me again as <name>"** and **"Remove <name>"**. Each row's controls name their own row.
- The save control keeps its name, **"Save this name"**, and does not exist until there has been a
  greeting. It is **absent from the DOM**, not present-and-disabled.
- **Removing** takes exactly one name out of the list. The other saved names keep their order.
  Removing frees a slot, so a save that was refused a moment ago succeeds afterwards.
- **Removing moves focus to the Saved names region**, which then announces its new contents. The
  control that was pressed no longer exists to hold focus.
- **Saving does not move focus.** The save control survives its own activation, so the visitor is
  left where they were.
- The Saved names region is a **polite live region**: its new contents are announced when the list
  changes and when a refusal is shown.
- The Name field's **saved-name hint** names every saved name in list order — visible text reading
  **"Saved: Ada, Bob, Cleo"**, programmatically associated with the field as a description. It is
  absent while nothing is saved.
- When a blank-name alert is on screen at the same time, the field is described by **both**, and
  the **alert comes first**, exactly as it is today.
- **Greeting again is an ordinary greeting.** The status region updates and re-announces even when
  the name is unchanged; a standing blank-name alert clears; the Name field keeps the visitor's
  draft untouched; and the saved names do not change.
- **Removing does not touch the greeting.** A visitor greeted as Ada who removes Ada is still
  greeted as Ada. Being greeted and being saved are independent, as they already are.
- **Blank submissions never touch the saved names.** A blank submission is not a greeting, so
  there is nothing to save and nothing to remove.
- All controls sit **inside the Saved names region, outside the `<form>`**. Pressing Enter in the
  Name field still greets from the field.
- Agreed copy: heading **"Saved names"**, empty state **"No names saved yet."**, save control
  **"Save this name"**, row controls **"Greet me again as <name>"** and **"Remove <name>"**, hint
  **"Saved: <name>, <name>"**, already-saved **"<name> is already saved."**, limit **"Five names
  is the limit. Remove one to save another."**
- Everything is in memory. A **fresh visit** has nothing saved.

## What depends on what

Stated as domain facts, not as a slicing instruction — how this is cut into slices, and what
declares itself blocked by what, is the `po` node's call.

- **Saving presupposes a greeting.** Unchanged from the saved name: there is nothing to save until
  the visitor has been greeted.
- **Holding more than one presupposes saving.** Everything else here is about a list that already
  has names in it.
- **Both row controls presuppose a saved name**, and need nothing from each other. Greeting again
  is correct with no remove control anywhere on screen, and removing is correct whether or not the
  visitor ever greets again. They touch different things — one the submission path, the other the
  list itself.
- **The refusals presuppose saving, and nothing else.** "Already saved" needs a list that can
  contain the name; "five is the limit" needs a list that can be full. Neither needs removing, and
  neither needs the hint.
- **The limit's escape hatch presupposes removing.** The refusal tells the visitor to remove a
  name, so the two are only jointly true once removing exists.
- **The hint presupposes a saved name** and needs nothing from the row controls.

## Out of scope

- **Persisting anything.** No backend, no `localStorage`, no `sessionStorage`, no analytics. Run 1
  shipped a constraint test (`never writes to web storage`) and a fresh-visit guard slice; this
  feature must not be the thing that breaks either.
- **The greeting log.** A record of every greeting, appended automatically, is a different
  capability with its own unmerged branches. Saved names are chosen; log entries are not.
- **Reordering, sorting or renaming.** The list order is the order things were saved, and nothing
  in this feature changes it.
- Editing a saved name in place, or saving a name the visitor was never greeted as.
- Copying a saved name into the Name field. Outcomes do not write to the field.
- Undoing a removal, or confirming before one.
- **Showing the count.** No "3 of 5", no slots-remaining, no total anywhere on the screen.
- Making the limit configurable, or changing it.
- Changing anything about how blank submissions behave.
- Timestamping saves, counting them, or summarising them.
- Internationalisation, and styling beyond what the existing markup implies.

## Decisions

- **Remembering is chosen, not recorded.** A name enters the list only when the visitor presses
  Save. The alternative — appending every greeting automatically — is the greeting log, a separate
  feature that already exists on its own branches. Keeping this deliberate is what makes every row
  something the visitor meant, which is what justifies giving each row its own controls.
- **Saving a name already saved changes nothing.** A saved name is an identity, not an event. A
  second Ada would mean two identical rows the visitor cannot tell apart and cannot explain, and
  moving Ada to the front would rearrange the list under someone who is reaching for a control.
  It still says something, because a button that appears to do nothing is the silence this
  codebase has twice designed against.
- **Names are removable, one at a time.** Replacing was the only way the old saved name ever
  changed, and lifting the one-slot limit takes that escape hatch away. Without removal a mistyped
  name sits on screen for the rest of the visit next to its own greet-again control. Per-name
  removal is the only shape that drops the typo while keeping the names that were meant.
- **Oldest first, and a row never moves.** These are controls, not lines of text: a row that
  shifts position is a control that moves out from under the visitor's aim and out from under a
  screen-reader user's count of the list. Appending is the only order in which a saved name stays
  where the visitor left it.
- **Five, and the sixth is refused.** A bound keeps the field's description a sentence rather than
  an unbounded recital. Refusing rather than dropping the oldest is the only ending consistent
  with the visitor choosing what is remembered — silently discarding a name someone deliberately
  kept would undo the premise of the feature to make room for it.
- **Refusals live in the region, not at the Name field.** The existing alert element is wired up
  as the Name field's description; putting a message about a full list there would describe the
  field with an error that has nothing to do with what was typed. The refusal is about the list,
  so it belongs with the list, which already announces itself politely.
- **The save control stays visible when the list is full.** Hiding it would follow the existing
  rule that a control with nothing to do does not exist, but the control would then vanish
  mid-visit with no explanation and no way to learn that removing brings it back. The refusal is
  what teaches the limit; a missing button teaches nothing.
- **Row controls carry their name — this supersedes the fixed-name rule.** The saved name's rule
  that control names never contain the name was made when there was exactly one control, to stop
  one button changing identity from moment to moment. A row's control acts on one name for as
  long as the row exists, so it does not drift; and five buttons all announcing "Greet me again"
  would be indistinguishable to anyone not looking at the screen — the very failure the old rule
  was written to prevent, arriving from the other direction.
- **Removing moves focus; saving still does not.** Removing destroys the control that was pressed,
  which is the case this codebase already answered for the greeting log's Clear by moving focus to
  the region. Saving is the opposite case: its control survives, so moving focus would take the
  visitor somewhere they did not ask to go. Focusing the region rather than a neighbouring row is
  one rule with no special case for removing the last name, and it never parks focus on a
  destructive control the visitor did not choose.
- **Removing does not touch the greeting.** Being greeted and being saved are already independent
  — a visitor can be greeted as Bob while Ada stays saved — so removal has no reason to reach into
  the status region. The greeting log's Clear did remove the current greeting, but only because
  the greeting *was* the newest log entry; here it is not.
- **In memory only.** The saved names die with the visit, like everything else on this screen.

## Ubiquitous language

- **Saved names** — the ordered set of names the visit is holding onto, each captured from a
  greeting by an explicit act of the visitor. At most five. Replaces **Saved name** (singular)
  from the previous feature, which named a single slot that no longer exists.
- **Saving** — appending the name currently being greeted to the saved names.
- **Already saved** — the state of a name that is in the list when the visitor saves it again.
  Saving is refused in the sense that nothing changes, but the visitor has lost nothing.
- **Full** — the state of a list holding five names, in which saving a new name is refused.
- **The limit** — five. The most names a visit can hold at once.
- **Removing** — taking one name out of the saved names. The only way a name leaves the list.
- **Row** — one saved name on screen together with the two controls that act on it.
- **Greeting again** — being greeted as one of the saved names, without retyping it.
- **Saved-name hint** — the description at the Name field naming every saved name.
- **Nothing saved** — the state before the first save, and the state of a fresh visit.

Terms carried over unchanged from the `greet-visitor` and `saved-name` features, used with exactly
their existing meanings: **Visitor**, **Name**, **Greeting**, **Blank name**, **Trimmed**,
**Fresh visit**, **Status region**, **Alert**.

Deliberately retired: **Replacing**. With a list there is nothing to replace — a name is added or
it is not, and it leaves only by being removed.

## Open questions

- **Whether five is the right number.** It was chosen to keep the field's description readable, not
  measured against anyone using the screen. Nothing else in the feature depends on the value.
- **Whether "already saved" should be said at all.** The visitor has lost nothing, so the message
  may read as a telling-off for a harmless act. It is included because silence after a button
  press is the failure this codebase keeps designing against, but the two readings were not tested
  against a real visitor.
- **Whether the hint should list names while the visitor is typing.** As agreed it is present
  whenever anything is saved, including mid-draft, when a growing list of names is arguably noise
  in the field's description.
- **Whether removing the name currently greeted should also clear the greeting.** Agreed that it
  should not, on the grounds that greeting and saving are independent — but a visitor who removes
  the name they are looking at may read the leftover greeting as a failed removal.
- **Whether the refusals should interrupt.** They are announced politely, like everything else in
  the region. A refused save is arguably closer to the blank-name alert, which interrupts.
- Nothing else material at this size.

---

# Product brief (po)

The sections above are the seed, agreed before this graph ran, and are not altered below. Every
term below is used with exactly the meaning given it in Ubiquitous language above. Everything in
this brief is `remembered-names` scope; nothing here reopens `greet-visitor` or the merged
single-slot `saved-name` feature, both of which this feature builds on top of.

## Persona

**The visitor** — the one person this whole screen is for (carried unchanged from `greet-visitor`
and `saved-name`). Their job here: hold onto more than one name across a single visit — "I'm
sometimes Ada, sometimes Bob" — and move between them without retyping, without one choice
costing them another, and without a screen full of names they never meant to keep.

## Epic

**Hold and use more than one saved name.** Everything below is one epic: the single-slot saved
name becomes an ordered list of up to five, with a way to add to it, use any entry, and take one
back out — deliberately, never automatically, never by accident.

## Story map

Backbone — the visitor's path through a visit that saves more than one name, left to right:

| Arrive | Greet | Save | See the list | Use any saved name | Correct the list | Be reminded while typing |
|---|---|---|---|---|---|---|
| Nothing saved yet | Ordinary greeting (unchanged) | Save appends, never replaces | Rows, oldest first | Greet again as any row | Remove one row | Hint names them all |
| *(01, 07)* | *(existing, unmodified)* | *(01)* | *(01)* | *(02)* | *(03)* | *(06)* |
| | | Saving what's already there does nothing, and says so *(04)* | | | Removing frees a slot the limit refusal pointed at *(05)* | |
| | | Saving past five is refused, and says so *(05)* | | | | |

**Walking skeleton — stories 01 + 02, together.** The seed names the defect this feature exists
to fix: "saving a second throws the first away without saying so." Saving alone does not prove
that fix — it only proves a row was drawn. The skeleton is not complete, and the promise "hold
several, use any of them" is not demonstrated, until a *second* name survives a save **and** the
visitor can be greeted as the *first* one again. Stories 01 and 02 ship together as one thin
slice through the whole backbone, exactly as `saved-name` issues 01+02 did for the single-slot
predecessor.

**Later slices deepen the backbone**, in the order they ship:
- 03 (Correct the list) — removing, one at a time, with its own focus rule.
- 04 (Save — refusal, path 1) — the already-saved refusal. Needs only saving (01); independent of
  removing.
- 05 (Save — refusal, path 2) — the full-list refusal. Needs removing (03) too, because its own
  copy ("Remove one to save another") is only demonstrably true once removing exists to try.
- 06 (Be reminded while typing) — the hint, in list order. Needs only a saved name (01).
- 07 (Arrive, revisited) — a fresh visit starts clean, proven against every control and message
  the six stories above introduced.

## User stories

### 01 — Hold more than one saved name (walking skeleton, part 1 of 2)

As a **visitor**,
I want each name I save to be added to the list rather than replace what I already saved,
so that saving a second name never throws away the first.

```gherkin
Scenario: The Saved names region is present and empty before any greeting
  Given the visitor is on the greeting screen
  And the visitor has not been greeted yet
  Then the Saved names region is present
  And the Saved names region appears after the status region in the page
  And the Saved names region reads "No names saved yet."
  And the Saved names region has the attribute aria-live="polite"
  And no button named "Save this name" is present

Scenario: The save control appears only once there has been a greeting
  Given the visitor is on the greeting screen
  And no button named "Save this name" is present
  When the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then a button named "Save this name" is present inside the Saved names region

Scenario: Saving the first name adds one row
  Given the visitor has been greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the Saved names region contains a row for "Ada"
  And "No names saved yet." is no longer shown

Scenario: Saving a second, different name adds a second row without losing the first
  Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
  When the visitor types "Bob" into the Name field
  And the visitor activates the submit control
  And the visitor activates "Save this name"
  Then the Saved names region contains a row for "Ada" and a row for "Bob"
  And the row for "Ada" appears before the row for "Bob"

Scenario: Saving does not move focus
  Given the visitor has been greeted "Hello, Ada"
  When the visitor activates "Save this name"
  Then the "Save this name" button still has focus

Scenario: Saving captures the greeting, never an untyped draft in the Name field
  Given the visitor has been greeted "Hello, Ada"
  When the visitor clears the Name field
  And the visitor types "Grace" into the Name field without submitting
  And the visitor activates "Save this name"
  Then the Saved names region contains a row for "Ada" only
  And the Name field still contains "Grace"

Scenario: A blank submission never touches the saved names
  Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then an alert reads "Please enter your name."
  And the Saved names region still contains a row for "Ada" only

Scenario: The save control sits outside the form and does not submit it
  Given the visitor has been greeted "Hello, Ada"
  And the Name field now contains "Grace"
  When the visitor activates "Save this name"
  Then the greeting still reads "Hello, Ada"
```

### 02 — Greet again as any saved name (walking skeleton, part 2 of 2)

As a **visitor with more than one saved name**,
I want a "Greet me again as `<name>`" control on every row,
so that I can be greeted as any name I saved, not only the last one, without retyping it.

```gherkin
Scenario: A row's greet-again control names the row's own name
  Given the visitor has saved "Ada" and "Bob", in that order
  Then a button named "Greet me again as Ada" is present
  And a button named "Greet me again as Bob" is present

Scenario: Greeting again as an earlier saved name works, not only the most recent
  Given the visitor has saved "Ada" and "Bob", in that order
  And the visitor is currently greeted "Hello, Bob"
  When the visitor activates "Greet me again as Ada"
  Then the greeting reads "Hello, Ada"

Scenario: Greeting again is an ordinary greeting — it re-announces even when the name is unchanged
  Given the visitor has saved "Ada" and is currently greeted "Hello, Ada"
  When the visitor activates "Greet me again as Ada"
  Then the status region's content is replaced so the greeting announces again
  And the greeting still reads "Hello, Ada"

Scenario: Greeting again clears a standing blank-name alert
  Given the visitor has saved "Ada"
  And the visitor has just submitted a blank Name field, so an alert reads "Please enter your name."
  When the visitor activates "Greet me again as Ada"
  Then the greeting reads "Hello, Ada"
  And no alert is present

Scenario: Greeting again leaves the visitor's draft in the Name field untouched
  Given the visitor has saved "Ada"
  And the visitor has typed "Grace" into the Name field without submitting
  When the visitor activates "Greet me again as Ada"
  Then the greeting reads "Hello, Ada"
  And the Name field still contains "Grace"

Scenario: Greeting again does not change the saved names
  Given the visitor has saved "Ada" and "Bob", in that order
  When the visitor activates "Greet me again as Ada"
  Then the Saved names region still contains a row for "Ada" and a row for "Bob", in that order

Scenario: The greet-again control sits outside the form and does not submit it
  Given the visitor has saved "Ada"
  And the Name field now contains "Grace"
  When the visitor activates "Greet me again as Ada"
  Then the Name field still contains "Grace"
```

### 03 — Remove a saved name

As a **visitor who saved a name by mistake, or no longer wants it kept**,
I want a "Remove `<name>`" control on every row,
so that I can drop just that one name and keep every other name I meant to keep.

```gherkin
Scenario: A row's remove control names the row's own name
  Given the visitor has saved "Ada" and "Bob", in that order
  Then a button named "Remove Ada" is present
  And a button named "Remove Bob" is present

Scenario: Removing takes out exactly one name and keeps the others in order
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  When the visitor activates "Remove Bob"
  Then the Saved names region contains a row for "Ada" and a row for "Cleo", in that order
  And no row for "Bob" is present

Scenario: Removing moves focus to the Saved names region
  Given the visitor has saved "Ada" and "Bob", in that order
  When the visitor activates "Remove Ada"
  Then the Saved names region has focus

Scenario: Removing the only saved name returns the region to its empty state
  Given the visitor has saved "Ada" only
  When the visitor activates "Remove Ada"
  Then the Saved names region reads "No names saved yet."
  And the Saved names region has focus

Scenario: Removing does not touch the greeting
  Given the visitor has saved "Ada" and is currently greeted "Hello, Ada"
  When the visitor activates "Remove Ada"
  Then the greeting still reads "Hello, Ada"

Scenario: Removing frees a slot for another save
  Given the visitor has saved "Ada" only
  When the visitor activates "Remove Ada"
  And the visitor types "Bob" into the Name field
  And the visitor activates the submit control
  And the visitor activates "Save this name"
  Then the Saved names region contains a row for "Bob" only

Scenario: The remove control sits outside the form and does not submit it
  Given the visitor has saved "Ada"
  And the Name field now contains "Grace"
  When the visitor activates "Remove Ada"
  Then the greeting is unaffected by the removal
  And the Name field still contains "Grace"
```

### 04 — Saving a name already saved is refused

As a **visitor who saves the same name a second time**,
I want to be told the name is already saved, with the list left exactly as it was,
so that I know my press did something, and I never see two rows for the same name.

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

### 05 — Saving while the list is full is refused, and removing is the way out

As a **visitor whose visit already holds five names**,
I want to be told the list is full and how to make room,
so that I understand why saving did nothing and what to do about it.

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

### 06 — Be reminded of every saved name at the Name field

As a **visitor about to type a name**,
I want the Name field to remind me which names are already saved,
so that I don't have to hold the whole list in my head while deciding what to save next.

```gherkin
Scenario: The hint is absent while nothing is saved
  Given the visitor has not saved any name
  Then no element with the text "Saved:" is present
  And the Name field has no description referring to saved names

Scenario: The hint lists every saved name, in the order they were saved
  Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
  Then the Name field is described by text reading "Saved: Ada, Bob, Cleo"

Scenario: The hint updates as names are saved and removed
  Given the visitor has saved "Ada" and "Bob", in that order
  And the Name field is described by text reading "Saved: Ada, Bob"
  When the visitor activates "Remove Ada"
  Then the Name field is described by text reading "Saved: Bob"

Scenario: The hint is present while the visitor is mid-draft
  Given the visitor has saved "Ada"
  When the visitor types "Gr" into the Name field without submitting
  Then the Name field is still described by text reading "Saved: Ada"

Scenario: When a blank-name alert and the hint are both present, the alert is described first
  Given the visitor has saved "Ada"
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then an alert reads "Please enter your name."
  And the Name field's description lists the alert before the saved-name hint
```

### 07 — A fresh visit starts with nothing saved

As a **visitor whose visit has ended**,
I want a fresh visit to start with an empty list of saved names,
so that I never see names, controls or messages left over from someone else's visit.

```gherkin
Scenario: A fresh visit after saving several names starts clean
  Given the visitor saved "Ada", "Bob" and "Cleo" during a visit
  When the visitor starts a fresh visit
  Then the Saved names region reads "No names saved yet."
  And no button named "Save this name" is present
  And no button named "Greet me again as Ada" is present
  And no button named "Remove Ada" is present
  And the Name field has no description referring to saved names

Scenario: A fresh visit after removing a name starts clean too
  Given the visitor saved "Ada" and "Bob" and then removed "Ada" during that visit
  When the visitor starts a fresh visit
  Then the Saved names region reads "No names saved yet."
  And no row for "Bob" is present

Scenario: A fresh visit after a refused save starts clean too
  Given the visitor saved five names and then had a save refused with "Five names is the limit. Remove one to save another." during that visit
  When the visitor starts a fresh visit
  Then the Saved names region reads "No names saved yet."
  And no text "Five names is the limit. Remove one to save another." is present
```

## Out of scope (product owner confirmation)

Everything the seed's own **Out of scope** section excludes is confirmed excluded by every story
above — no story, screen or scenario reintroduces any of it:

- **Persisting anything.** No scenario above asserts a storage write, and none may be added; the
  existing `never writes to web storage` constraint test and the `greet-visitor` fresh-visit guard
  are unmodified by this feature.
- **The greeting log.** No story above appends an entry automatically; every row in every
  scenario is added only by an explicit "Save this name" activation.
- **Reordering, sorting or renaming.** No scenario ever asserts a row moving after it is placed;
  "the row for `<name>` appears before the row for `<name>`" scenarios only ever assert save order,
  never a reorder.
- **Editing a saved name in place, or saving a name the visitor was never greeted as.** No story
  introduces an edit control; story 01's "captures the greeting, never an untyped draft" scenario
  is the boundary that rules this out.
- **Copying a saved name into the Name field.** No scenario in stories 02 or 03 asserts the Name
  field's value changes as a result of greeting again or removing.
- **Undoing a removal, or confirming before one.** Story 03 has no confirmation-dialog step and no
  "undo" control; removal in every scenario is immediate.
- **Showing the count.** No scenario asserts any "N of five" or "N remaining" text anywhere; story
  05's scenarios assert only the fixed refusal sentence, never a number the visitor didn't type.
- **Making the limit configurable, or changing it.** Five is a literal in every story-05 scenario,
  never a value read from anywhere else.
- **Changing anything about how blank submissions behave.** Story 01 and story 06 each carry a
  scenario proving a blank submission leaves the saved names and the hint untouched.
- **Timestamping, counting, or summarising saves.** No row in any scenario carries anything but a
  name and its two controls.
- **Internationalisation, and styling beyond what the existing markup implies.** Not addressed by
  any story; copy throughout is the seed's Agreed copy, verbatim, in English only.

One additional, product-owner-level exclusion for this slice: **which of a row's two controls
reads first, left-to-right or in the DOM.** The seed fixes both controls' names and that a row
carries both; it does not fix their relative order, and no scenario above depends on one coming
before the other. That ordering is `ux`/`architect`'s call, not reopened here.
