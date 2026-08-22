# The greeting log

> Seed for the second sdlc2 lab run. The shared understanding below was agreed in a grilling
> before the graph was invoked — it is the thing every downstream node is scored against.

## Capability

During a visit, a visitor can see every name they have been greeted as, in order, and clear that
record when they are done. Today the screen shows only the most recent greeting: the previous
ones vanish the moment a new name is submitted, so a visitor has no way to look back at what they
have already done. This gives a visit a memory of itself, and a way to wipe it.

## Agreed scope

- The greeting log sits on the greeting screen, below the greeting. It is headed
  **"Greeted this visit"**.
- The log region is present from the first render. While it has no entries it says so in words:
  **"You have not been greeted yet."**
- Every successful greeting appends one entry. Entries read oldest first.
- Being greeted as the same name twice produces **two** entries.
- The greeting currently shown in the status region is itself the newest entry. One greeting, one
  entry, always — the visitor sees the name in both places, saying two different things.
- A clear control exists **only while the log has entries**. It is absent from the DOM when the
  log is empty.
- Clearing empties the log **and removes the current greeting with it**, returning the screen to
  its not-yet-greeted appearance. The Name field keeps whatever the visitor typed.
- After clearing, focus moves to the log region, so a screen reader announces the empty state.
- Everything is in memory. A fresh visit starts with an empty log.

## Out of scope

- **Persisting the log anywhere.** No backend, no `localStorage`, no `sessionStorage`, no
  analytics. Run 1 shipped a constraint test (`never writes to web storage`) and a fresh-visit
  guard slice; this feature must not be the thing that breaks either.
- Removing, editing or re-greeting from an individual entry. Clearing is all-or-nothing.
- De-duplicating, reordering, or capping the log. No maximum length.
- Counting or summarising the log ("greeted 3 times"). It shows names, not statistics.
- Undoing a clear.
- Changing anything about how blank submissions behave.
- Internationalisation, and styling beyond what the existing markup implies.

## Decisions

- **The log is a sequence, not a set.** Every greeting is an entry, repeats included. A set would
  force a de-duplication rule and then a reordering rule ("does being greeted as Ada again move
  her to the top?"), and every answer to those is a requirement nobody asked for.
- **Oldest first.** It is the order things happened in, and it needs no rule of its own. It also
  means an appended entry never moves an existing one.
- **The current greeting is an entry.** Excluding it would leave the log empty after the very
  first greeting, which contradicts the capability, and would need a rule for the exact moment an
  entry graduates from *current* to *past*.
- **An empty log says so in words**, rather than being an empty container or an absent one.
  A bare empty region is satisfied by two different DOM shapes, which is the ambiguity run 1's
  VH-04 was raised to remove; stating it in text leaves one shape and one assertion.
- **Clearing removes the greeting too.** The status region and the log are two views of one fact.
  Clearing only the log would put "You have not been greeted yet." directly beneath a live
  "Hello, Ada", so it would need a second, different empty message to avoid lying.
- **Clearing does not touch the Name field.** The field holds the visitor's draft, not a
  greeting; run 1 already established that outcomes never write to it.
- **The clear control does not exist when there is nothing to clear.** This removes a question
  rather than adding one: there is no empty click whose silence has to be made perceivable (run
  1 spent four decision records and two counters on exactly that problem for the submit button),
  and no disabled button, which would be unfocusable and unexplained.
- **Focus moves to the log region after clearing.** Clearing destroys the control that was
  focused; without focus management the visitor is dumped at the top of the document and hears
  nothing, because a live region emptying announces nothing. Moving focus to the region makes the
  outcome audible and gives focus somewhere real. The log is deliberately *not* an `aria-live`
  region — that would double-announce every greeting alongside the status region.
- **Blank submissions never touch the log.** A blank submission is not a greeting, so nothing is
  appended and nothing is removed. Stated rather than left silent, because silence reads as an
  omission.
- **In memory only.** The log dies with the visit, like everything else on this screen.
- **This is two slices, not one.** Showing the log and clearing it are separate capabilities, and
  clearing cannot be demonstrated until there is something to clear — the clear slice is blocked
  by the show slice. They must not be collapsed into a single slice.

## Ubiquitous language

- **Greeting log** — the ordered record of every greeting made during this visit, oldest first.
  Not "history": it includes the greeting currently on screen, and it does not outlive the visit.
- **Log entry** — one greeting in the log. Two greetings with the same name are two entries.
- **Empty log** — a log with no entries: before the first greeting, and after clearing.
- **Clearing** — emptying the log and removing the current greeting with it.

Terms carried over unchanged from the `greet-visitor` feature, and used with exactly their
existing meanings: **Visitor**, **Name**, **Greeting**, **Blank name**, **Trimmed**,
**Fresh visit**, **Status region**, **Alert**.

## Open questions

- **The clear control's accessible name.** "Clear the list" appeared in the grilling's sketches
  and drew no objection, but it was never the question asked, so it is not agreed copy. The
  heading ("Greeted this visit") and the empty-log text ("You have not been greeted yet.") *were*
  chosen by the human and are agreed.
- **Whether appending an entry needs its own announcement.** The status region already announces
  "Hello, <name>" on every successful submit, and the log gaining an entry at the same moment is
  assumed not to need a second announcement. If that assumption is wrong, the fix is a decision
  about the log region, not about the greeting.
- Nothing else material at this size. If the log ever needs to survive a reload, that is a
  different capability and a different feature — and it would put this feature's Out of scope
  into direct conflict with run 1's shipped constraint test.

---

## Product contract

> Everything below is produced by the `po` node from the agreed scope above. Every decision,
> constraint and exclusion in the seed sections above is carried into a story, an acceptance
> criterion, or an explicit Out-of-scope line below — nothing is silently dropped. This feature
> extends the `greet-visitor` screen; terms already fixed there (**Visitor**, **Name**,
> **Greeting**, **Blank name**, **Trimmed**, **Fresh visit**, **Status region**, **Alert**) are
> used with exactly their existing meanings and are not redefined here.

## User persona

**The Visitor** (unchanged from `greet-visitor` — nobody has an account, a session, or an
identity beyond the text they type). **Job-to-be-done for this feature:** "let me look back at
everyone I've been greeted as during this visit, and let me wipe that log clean when I'm done
with it" — today the screen has no memory of itself beyond the single most recent greeting, so a
visitor who has greeted themselves as three different names in one sitting cannot see the first
two again, and has no way to reset the screen except reloading (which this feature's Out of scope
does not add either).

## Contract vocabulary

> The seed's Ubiquitous language section is the human-agreed shared understanding; nothing is
> added to it or changed in it here. The three entries below are added by the `po` node so every
> scenario below uses one fixed DOM shape and one fixed name for each new screen element, instead
> of each story inventing its own. One of them (the clear control's accessible name) goes beyond
> what the seed literally fixes and is flagged `po-proposed, unconfirmed` — see
> `VERIFY-WITH-HUMAN.md` VH-01.

- **Greeting log region** — the landmark this feature adds below the status region: a `region`
  landmark with the accessible name **"Greeted this visit"** (the seed's agreed heading text,
  associated via `aria-labelledby`), present in the DOM from the first render and never removed.
  It is also focusable programmatically (`tabIndex={-1}`, not in the tab order) so that "focus
  moves to the log region after clearing" (seed, Decisions) is one observation:
  `expect(logRegion).toHaveFocus()`. Every scenario's *"the greeting log is present"* means
  `expect(screen.getByRole('region', { name: 'Greeted this visit' })).toBeInTheDocument()`. The
  region's accessible name is realized by a visible `<h2>Greeted this visit</h2>` the region
  references via `aria-labelledby` — not an `aria-label` with no visible text — so every
  scenario's *"a heading reads 'Greeted this visit'"* means
  `expect(screen.getByRole('heading', { name: 'Greeted this visit' })).toBeInTheDocument()`, and
  that heading **is** the region's accessible name (the same element satisfies both assertions).
  Every scenario's *"the greeting log follows the status region in document order"* means
  `expect(statusRegion.compareDocumentPosition(logRegion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()`
  — the seed's agreed scope places the log "below the greeting," and sequential screen-reader
  reading order (as distinct from visual/CSS position, which remains out of scope) follows DOM
  order, so this is the one DOM-observable consequence of that placement.
- **The greeting log's two DOM shapes** — pinned to exactly one shape per state, for the same
  reason the seed's Decisions section gives for stating the **empty log** in words rather than
  leaving a bare container: *"A bare empty region is satisfied by two different DOM shapes... this
  is the ambiguity run 1's VH-04 was raised to remove."*
  - **Empty** (before the first greeting, and after clearing): no element with role `list` is
    present inside the region, and the region contains an element whose text is exactly "You have
    not been greeted yet." — deliberately *"an element whose text is exactly..."*, not "the
    region's text reads exactly...", because the region also contains its own visible
    `<h2>Greeted this visit</h2>` heading, so the region's own combined text content is never
    exactly the empty message alone. Every scenario's *"the greeting log is empty"* means both
    `within(logRegion).queryByRole('list')` is `null` **and**
    `within(logRegion).getByText('You have not been greeted yet.')` resolves.
  - **Non-empty**: entries are an ordered list (`role="list"`, i.e. a native `<ol>`) of list items
    (`role="listitem"`, i.e. `<li>`), one per greeting, oldest first, so DOM order *is* the
    order — no separate sort key is ever needed. Each item's text is the greeted **Name**,
    trimmed, alone, matched **exactly**, not as a substring — never the full "Hello, `<name>`"
    sentence and never a count (seed Out of scope: "It shows names, not statistics"). The empty
    message is gone in this shape: `within(logRegion).queryByText('You have not been greeted
    yet.')` is `null` — the two shapes are mutually exclusive, not layered. Every scenario's
    *"the greeting log has exactly N entries, oldest first: `"A"`, `"B"`, ..."* means
    `within(logRegion).getAllByRole('listitem')` has length N, and, read in DOM order, each item's
    text content is **exactly** the corresponding name:
    `expect(items[i].textContent.trim()).toBe(name)` (equivalently,
    `expect(items[i]).toHaveTextContent(new RegExp('^' + name + '$'))`) — **never**
    `expect(items[i]).toHaveTextContent(name)` alone. jest-dom's `toHaveTextContent` takes a
    `string | RegExp` and an optional `{ normalizeWhitespace }` flag — there is no `exact` option,
    and a plain string argument is always a **substring** match, so
    `toHaveTextContent(name, { exact: true })` is silently identical to `toHaveTextContent(name)`
    and would also match the forbidden full "Hello, `<name>`" sentence (`toHaveTextContent('Ada')`
    passes against `<li>Hello, Ada</li>`); do not write that form. The region
    no longer contains the empty message text. *"The greeting log's newest entry reads `"X"`"*
    means the **last** item in that same list, matched the same exact way.
- **Clear control** *(accessible name `po-proposed, unconfirmed` — see `VERIFY-WITH-HUMAN.md`
  VH-01, VH-04 and VH-05)* — a button, proposed accessible name **"Clear the log"**. The
  grilling's own sketched phrase, "Clear the list" (seed's Open questions), was VH-01's original
  default; VH-04 then flagged that "list" is a third, different word for the concept the seed
  elsewhere fixes as **Greeting log** ("Not 'history'"), and VH-05 resolves that by promoting the
  vocabulary-consistent phrasing, "Clear the log," to the default used throughout this contract.
  "Clear the list" remains named as the alternative a human may confirm instead (VH-05). Present
  in the DOM only while the greeting log has at least one entry, absent otherwise: *"the clear
  control is present"* means `screen.queryByRole('button', { name: 'Clear the log' })` is
  non-null; *"the clear control is not present"* means it is `null`. *"The visitor activates the
  clear control"* means clicking it (or activating it via keyboard while it is focused, per
  native button semantics — same convention as the **Submit control** in `greet-visitor`).
- **Not-yet-greeted appearance** — the status region's state before any greeting this visit:
  present, holding no text (`greet-visitor` feature.md, **Status region**). Clearing (seed,
  Ubiquitous language: "emptying the log and removing the current greeting with it") returns the
  status region to exactly this state — not a second, different empty message. Every scenario's
  *"the status region is present and contains no text"* means
  `expect(screen.getByRole('status')).toHaveTextContent('')`, exactly as in `greet-visitor`.
- **No live announcement on the greeting log itself.** The seed's Decisions section is explicit
  that the log is "deliberately *not* an `aria-live` region — that would double-announce every
  greeting alongside the status region", and its Open questions note the assumption that an
  appended entry needs no announcement of its own (the status region's existing "Hello,
  `<name>`" announcement already covers the moment). No scenario below asserts an `aria-live`
  attribute one way or the other — whether an attribute is present is not observable as rendered
  behaviour through the DOM under this repo's convention (`CLAUDE.md`) — so this constraint is
  carried by this vocabulary entry, by Out of scope below, and by a human check recorded at
  `VERIFY-WITH-HUMAN.md` VH-02, the same pattern `greet-visitor` used for its own "text, not
  colour" constraint (that feature's VH-07).

## Epic

**Epic: The greeting log — a visit remembers itself.** Today the greeting screen shows only the
most recent greeting: the moment a new name is submitted, every name before it is gone, so a
visitor who has been greeted more than once in a visit cannot look back at what already happened,
and has no way to wipe the screen clean short of leaving it. This epic adds a running, ordered
record of every greeting made this visit, and a way to clear that record — both living and dying
with the visit itself, never surviving a reload, exactly like the greeting it is built from.

## Story map

Backbone — the visitor's journey through the greeting screen, left to right, extending
`greet-visitor`'s own backbone (`Arrive -> Enter a name -> Submit -> See the outcome`) with two
more steps this feature adds:

```
[Arrive at the greeting screen] -> [Be greeted, one or more times] -> [Read back the greeting log] -> [Clear the log when done]
```

**Walking skeleton** (thinnest end-to-end slice — ships first, marked *SKELETON* below): visitor
arrives to an empty log that says so in words, types one name, submits, and sees the greeting log
gain exactly one entry matching the name they typed. One option at each of the **three** backbone
steps it walks — `Arrive at the greeting screen` -> `Be greeted, one or more times` -> `Read back
the greeting log` — proving those three steps work end to end before any of them is deepened. It
deliberately does **not** walk the fourth backbone step, `Clear the log when done`: that step is
untouched by the skeleton and is Story 2's job to walk for the first time (see Later slices,
below). This is Story 1's first scenario, `The visitor sees the greeting log gain its first
entry`.

Story 1 as a whole is that skeleton **plus** the log's arrival state (empty, in words, in document
order after the status region) and seven tightly-coupled variations of "being greeted, one or more
times": oldest-first ordering across several greetings, the same name producing two distinct
entries, the currently-shown greeting being the log's own newest entry, trimming carrying through
to the entry text, a blank submission touching neither the greeting nor the log when there is
already an entry to leave alone, the same for a whitespace-only submission, and a blank submission
on a log that is still empty leaving it exactly as it was (the one cell of "blank x log state"
the other two variations do not reach). None of these introduces a different
backbone step or a different outcome shape (an entry appended to the log, or deliberately not);
they are the "be greeted" and "read back" steps' full rule set for the one path the skeleton
already walks — exactly the reasoning `greet-visitor`'s Story 1 used for its own trimming and
no-length-limit variations. Splitting them out would leave the skeleton scenario unable to prove
ordering, duplication or blank-safety alone, all of which the seed's Decisions section requires
before Story 1 can be called done.

Later slices — one **adds** the backbone step the skeleton leaves out entirely; the other
**deepens** a step the skeleton already walks once, for a case the skeleton does not cover:

- **Story 2** — walks the *"Clear the log when done"* step for the first time; the skeleton never
  touches this step at all, so Story 2 is an addition to the backbone's coverage, not a deepening
  of a path already walked. It adds a clear control that exists only while there is something to
  clear, and clearing that empties the log, removes the current greeting, leaves the Name field
  alone, and moves focus to the log region. Blocked by Story 1 —
  the seed's own Decisions section says so directly: *"clearing cannot be demonstrated until there
  is something to clear."*
- **Story 3** — deepens the *"Arrive"* step the skeleton already walks once (on the first visit),
  this time on a **second** visit: nothing in the log, and no clear
  control, survives it — a guard slice in the same spirit as `greet-visitor`'s Story 4, proving
  the log is in-memory-only exactly as the seed requires. Blocked by Story 2, not Story 1 alone:
  its two scenarios need a prior greeting (Story 1) *and* a prior clear (Story 2) to already exist
  and be tested, and every one of a story's own scenarios must be exercisable once its declared
  blocker has landed — the same rule `greet-visitor`'s Story 4 used for its own two scenarios
  (blocked on the last-landing dependency its scenarios exercise, not the first dependency that
  happens to be enough for only some of them).

Release order: Story 1, then Story 2, then Story 3.

**Non-regression note (not new acceptance criteria).** The seed's Out of scope is explicit that
this feature "must not be the thing that breaks" two things `greet-visitor` already shipped: the
constraint test `never writes to web storage` (`GreetingScreen.test.tsx`) and the fresh-visit
guard slice (issue 04, `starts from a clean screen on a fresh visit`). No story below re-tests
either — they already exist and continue to run unmodified against every slice in this feature;
Story 3 below is additive to them (a new fresh-visit guarantee, for the log), not a replacement.

## User stories

### Story 1 — See the greeting log grow *(SKELETON — ships first)*

As a **visitor**,
I want every greeting I receive this visit to be added to a log I can see,
so that I can look back at everyone I've been greeted as, not just the most recent one.

**Acceptance criteria**

```gherkin
Scenario: The visitor sees the greeting log gain its first entry
  Given the visitor is on the greeting screen
  And the greeting log is empty
  When the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And the greeting log has exactly one entry, oldest first: "Ada"
  And the greeting log no longer says "You have not been greeted yet."
  And a heading reads "Greeted this visit"

Scenario: The greeting log is present with its empty message before the first greeting
  Given the visitor is on the greeting screen
  And the visitor has not been greeted yet
  Then the greeting log is present
  And the greeting log is empty
  And a heading reads "Greeted this visit"
  And the greeting log follows the status region in document order

Scenario: Entries read oldest first, and the on-screen greeting is the log's newest entry
  Given the visitor has already been greeted "Hello, Ada" and then "Hello, Grace" this visit
  When the visitor clears the Name field
  And the visitor types "Alan" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Alan"
  And the greeting log has exactly three entries, oldest first: "Ada", "Grace", "Alan"
  And the greeting log's newest entry reads "Alan"

Scenario: Being greeted as the same name twice produces two entries
  Given the visitor has already been greeted "Hello, Ada" this visit
  When the visitor clears the Name field
  And the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And the greeting log has exactly two entries, oldest first: "Ada", "Ada"

Scenario: Tabs around a name are trimmed before the entry is added to the greeting log
  Given the visitor is on the greeting screen
  When the visitor enters "\tAda\t" (tab, "Ada", tab) into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And the greeting log has exactly one entry, oldest first: "Ada"

Scenario: A blank submission does not add to the greeting log
  Given the visitor has already been greeted "Hello, Ada" this visit
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then the greeting still reads "Hello, Ada"
  And an alert reads "Please enter your name."
  And the greeting log still has exactly one entry, oldest first: "Ada"

Scenario: A whitespace-only submission does not add to the greeting log
  Given the visitor has already been greeted "Hello, Ada" this visit
  When the visitor clears the Name field
  And the visitor enters "   " (three spaces) into the Name field
  And the visitor activates the submit control
  Then the greeting still reads "Hello, Ada"
  And an alert reads "Please enter your name."
  And the greeting log still has exactly one entry, oldest first: "Ada"

Scenario: A blank submission on an already-empty greeting log adds nothing
  Given the visitor is on the greeting screen
  And the greeting log is empty
  When the visitor activates the submit control with an empty Name field
  Then an alert reads "Please enter your name."
  And the greeting log is empty
  And the status region is present and contains no text
  And the clear control is not present
```

Note on the last scenario above, forward-referencing Story 2: the two blank/whitespace scenarios
before it both start from a log that already has one entry, and Story 2's own "no clear control"
scenario starts from an empty log but never submits anything — so no scenario anywhere pinned the
cell where *both* are true at once: the very first submission of the visit is blank, and the log
is still empty. Without this scenario, an implementation that (wrongly) creates the clear control
the moment any submission is attempted — rather than the moment an entry actually lands — would
pass every other scenario in this feature. *"The clear control is not present"* is the Contract
vocabulary term defined once for the whole feature and exercised for the first time by Story 2;
using it here does not change what Story 1 delivers, since a clear control never existing is the
same as it "not being present" from any story's point of view — it only closes the one gap in
Story 1's own "blank submissions never touch the log" guarantee (seed, Decisions) that the two
other blank/whitespace scenarios structurally cannot reach.

Note on the tab scenario's wording, matching `greet-visitor`'s own precedent (feature.md, Story 1,
"enters" note): *"enters"*, not *"types"*, and the value is given as text, not
keystrokes — under the declared frontend seam a literal Tab keystroke moves focus rather than
inserting a tab character, the step is driven by `user-event`'s paste, so the characters arrive
through the same seam as typing rather than through a raw DOM value assignment. The
behaviour under test is what the field contains, not how it got there. **Trimmed** in the seed's
Ubiquitous language and `greet-visitor`'s Contract vocabulary fixes the semantics
(`String.prototype.trim()`, not the ASCII space character alone) — a space-only scenario is
satisfied by an implementation that strips only spaces, which is exactly what this tab-based
scenario rules out.

Note on the whitespace-only scenario just above: the seed's Decisions say "Blank submissions
never touch the log," and **Blank name** (Ubiquitous language, carried over unchanged from
`greet-visitor`) is defined as "empty, or whitespace only, after trimming" — so the empty-field
case alone does not cover the rule. An implementation that keys the append off the raw field
value rather than the trimmed one would append a blank entry for "   " while still passing the
empty-field scenario above and every scenario `greet-visitor` already ships; this scenario is the
one that catches it. Same *"enters"* convention as the tab scenario, for the same reason (a
literal Space keystroke inserts a character correctly, but the value is given as text throughout
this feature's scenarios for consistency with the tab case it sits beside).

Three notes, all fixed in Contract vocabulary above so no scenario is open to interpretation:

- *"the greeting log is empty"* is the single, unambiguous state defined above (no `list`
  present, text reads "You have not been greeted yet.") — never a bare, textless container. See
  **The greeting log's two DOM shapes** and the seed's own Decisions ("An empty log says so in
  words").
- *"the greeting log has exactly N entries, oldest first: ..."* names the list-item text content
  in DOM order — the log entry's text is the trimmed **Name** alone, never the full "Hello,
  `<name>`" sentence (seed Out of scope: "It shows names, not statistics"). The three-greeting
  scenario above ("Ada", "Grace", "Alan") is the smallest count that distinguishes append-only
  growth (the seed's Decisions: "an appended entry never moves an existing one") from a
  fixed-size window that would silently drop the oldest entry once a cap is reached — two entries
  cannot tell those apart.
- The seed's Decisions ("The current greeting is an entry") is asserted directly, not as a
  separate scenario with no failure mode of its own: the third scenario above ("Entries read
  oldest first...") already asserts both "the greeting reads 'Hello, Alan'" and "the greeting
  log's newest entry reads 'Alan'" from the same Given/When, so the on-screen greeting and the
  log's last entry are pinned to agree in the same breath.

### Story 2 — Clear the greeting log

As a **visitor**,
I want to clear the greeting log when I'm done with it,
so that the greeting log and the current greeting go back to how they looked before I was greeted
at all — not the whole screen, which may still be showing an unrelated alert or an unsubmitted
draft in the Name field (see `VERIFY-WITH-HUMAN.md` VH-03).

**Note:** the assertion "the greeting log no longer says 'You have not been greeted yet.'" (Story
1's first scenario; see Contract vocabulary, **The greeting log's two DOM shapes**) is not
repeated in the scenarios below — it is made once, when an entry first appears — and is not
undone by anything in this story: clearing only restores the empty message (the third scenario
below, "the greeting log is empty," already covers that in the other direction).

**Acceptance criteria**

```gherkin
Scenario: No clear control is present before the first greeting
  Given the visitor is on the greeting screen
  And the visitor has not been greeted yet
  Then the clear control is not present

Scenario: The clear control appears once the greeting log has an entry
  Given the visitor is on the greeting screen
  When the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then the clear control is present

Scenario: Clearing empties the greeting log and removes the current greeting
  Given the visitor has already been greeted "Hello, Ada" and then "Hello, Grace" this visit
  When the visitor activates the clear control
  Then the greeting log is empty
  And the status region is present and contains no text

Scenario: Clearing removes the clear control itself
  Given the visitor has already been greeted "Hello, Ada" this visit
  When the visitor activates the clear control
  Then the clear control is not present

Scenario: Clearing does not touch the Name field
  Given the visitor has already been greeted "Hello, Ada" this visit
  And the visitor clears the Name field
  And the visitor types "Grace" into the Name field without submitting it
  When the visitor activates the clear control
  Then the Name field still contains "Grace"

Scenario: Focus moves to the greeting log after clearing
  Given the visitor has already been greeted "Hello, Ada" this visit
  When the visitor activates the clear control
  Then the greeting log has focus

Scenario: A greeting after clearing starts the greeting log again
  Given the visitor has already been greeted "Hello, Ada" this visit
  And the visitor activated the clear control
  When the visitor types "Grace" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Grace"
  And the greeting log has exactly one entry, oldest first: "Grace"
  And the clear control is present

Scenario: Clearing does not dismiss a pending alert
  Given the visitor has already been greeted "Hello, Ada" this visit
  And the visitor has since submitted a blank Name field and sees the alert
  When the visitor activates the clear control
  Then the greeting log is empty
  And the status region is present and contains no text
  And an alert still reads "Please enter your name."
```

The seed's "returning the screen to its not-yet-greeted appearance" is asserted directly by the
third scenario above: the status region goes back to exactly the same DOM state it was in on
first arrival (**Not-yet-greeted appearance**, Contract vocabulary) — not a second, different
"cleared" message, which would contradict the seed's Decisions ("Clearing removes the greeting
too... it would need a second, different empty message to avoid lying").

The seventh scenario above ("A greeting after clearing...") is required so no implementation can
latch a "cleared" flag that suppresses further entries or permanently hides the clear control —
clearing is a one-time action on the log's current contents, not a mode the screen gets stuck in;
the log and the clear control both behave, after a clear, exactly as they did on first arrival
(Story 1's own first scenario).

The eighth scenario above ("Clearing does not dismiss a pending alert") resolves an ambiguity the
seed leaves open: the seed's Out of scope is explicit that this feature changes "nothing about
how blank submissions behave," and `greet-visitor`'s own rule (feature.md, Story 3: "The alert
stays until the visitor submits again") is that the alert is dismissed only by a subsequent
submission, never by an unrelated control. The clear control is not a submission, so it does not
touch the alert — clearing acts only on the log and the current greeting, exactly as the seed's
Decisions describe ("Clearing removes the greeting too") and no more.

### Story 3 — A fresh visit starts with an empty log

As a **visitor**,
I want a fresh visit to start with an empty greeting log,
so that nothing this feature added — an entry, a clear control — is still there when I arrive
again. (The Name field's own fresh-visit guarantee is a separate, already-shipped promise —
`greet-visitor` issue 04 — unchanged and untouched by this feature.)

This deepens the "Arrive at the greeting screen" backbone step on a second visit, exactly as
`greet-visitor`'s Story 4 did for the Name field, the greeting and the alert. It is Valuable in
its own right: a returning visitor must never see another visit's greeting log, whether or not
that visitor ever used Story 2's clear control. It is nonetheless Blocked by Story 2 in build
order (see Story map above) because its second scenario needs a prior clear to already exist and
be tested — value-independence and build-order dependency are separate questions, and INVEST's "I"
is about the former. It also guards the same implementation trap Story 4 guarded there — the log's
state must live in the same component-local, unmount-discarded state as the rest of the visit, not
in a module-level variable or a write to `localStorage`/`sessionStorage` that happens to satisfy
Story 1's scenarios in isolation while leaking across visits.

**Acceptance criteria**

```gherkin
Scenario: A fresh visit starts with an empty greeting log
  Given the visitor has already been greeted "Hello, Ada" and then "Hello, Grace" this visit
  When the visitor starts a fresh visit
  Then the greeting log is empty
  And the clear control is not present

Scenario: A fresh visit starts with an empty greeting log even after a clear in the previous visit
  Given the visitor has already been greeted "Hello, Ada" this visit
  And the visitor activated the clear control
  And the visitor was then greeted "Hello, Grace" this visit
  When the visitor starts a fresh visit
  Then the greeting log is empty
  And the clear control is not present
```

Implementation note for the developer node: *"starts a fresh visit"* is the **Fresh visit**
Contract vocabulary term, carried over unchanged from `greet-visitor`. Under the declared frontend
seam (React Testing Library + user-event via Vitest/jsdom), this is driven by unmounting and
re-rendering the component from its initial state, not `window.location.reload()`. Real
reload-survival in a browser is a human check recorded at `greet-visitor`'s
`VERIFY-WITH-HUMAN.md` VH-02, unchanged by this feature.

## Out of scope

- **Persisting the log anywhere.** No backend call, no `localStorage` or `sessionStorage` write,
  no analytics event, for the log any more than for the greeting itself. `greet-visitor` already
  ships the constraint test `never writes to web storage` and the fresh-visit guard slice; Story 3
  above extends that guard to the log specifically, and no story in this feature implements a
  storage mechanism. As with `greet-visitor`'s own Out of scope, the stricter "not one byte is
  ever written, even if never read" half is a code-review concern, not an acceptance step — it is
  not observable through the rendered DOM.
- **Removing, editing or re-greeting from an individual log entry.** There is no per-entry
  control anywhere in this feature; Story 2's clear control is the only way to change the log's
  contents, and it acts on the whole log at once.
- **De-duplicating, reordering, or capping the greeting log.** Story 1's "same name twice
  produces two entries" and "oldest first" scenarios pin this directly — no story sorts, merges or
  truncates the log, and no maximum length is enforced anywhere.
- **Counting or summarising the greeting log** (e.g. "greeted 3 times"). Story 1's log-entry DOM
  shape carries names alone, never a count derived from the log.
- **Undoing a clear.** Once Story 2's clear control is activated, the entries and the current
  greeting are gone; no story adds a way to bring them back.
- **Changing anything about how blank submissions behave.** Story 1's "a blank submission does
  not add to the greeting log" scenario is additive to `greet-visitor`'s existing blank-name
  behaviour (the alert, the unchanged greeting); no story in this feature alters when the alert
  appears or what it says.
- **Internationalisation**, and **styling beyond what the existing markup implies.** Both the
  heading ("Greeted this visit") and the empty-log text ("You have not been greeted yet.") are
  fixed English strings; this is a behaviour slice, not a visual design pass.
- **The greeting log's visual (CSS) position on the screen** — pixel layout, spacing, and whether
  it is literally "below" the greeting on a rendered page. Story 1's second scenario asserts the
  one DOM-observable consequence of the seed's "below the greeting" placement instead — document
  order between the status region and the greeting log (see Contract vocabulary, *"the greeting
  log follows the status region in document order"*), since that is what determines sequential
  screen-reader reading order. Visual position beyond that DOM order is layout, covered by the
  styling exclusion above.
- **A live-region announcement for the greeting log gaining an entry**, and **the greeting log's
  own `aria-live` status**. The seed's assumption (Open questions) that the status region's
  existing announcement already covers the moment an entry is added is carried unchanged; no
  scenario in this feature asserts an `aria-live` attribute on the log region either way, and the
  seed's Decisions section rules an `aria-live` log region out directly ("that would
  double-announce every greeting"). Recorded for human review at `VERIFY-WITH-HUMAN.md` VH-02.
- **A confirmed accessible name for the clear control.** "Clear the log" is the `po-proposed,
  unconfirmed` string used throughout this contract — see Contract vocabulary and
  `VERIFY-WITH-HUMAN.md` VH-01, VH-04 and VH-05. "Clear the list" (the grilling's own sketched
  phrase) is named as the alternative a human may confirm instead. No scenario's pass/fail depends
  on either exact string surviving a human review unchanged; if the confirmed copy differs, only
  the string in the Gherkin and the implementation need to move together.
