# 01 — See the greeting log grow (walking skeleton)

Blocked by: none

Dir: src/

## Story

As a **visitor**,
I want every greeting I receive this visit to be added to a log I can see,
so that I can look back at everyone I've been greeted as, not just the most recent one.

The first scenario below is the walking skeleton: the thinnest end-to-end slice through the three
backbone steps it walks, `Arrive at the greeting screen -> Be greeted, one or more times -> Read
back the greeting log`. It deliberately does not walk the fourth backbone step, `Clear the log
when done` — that step is untouched here and is issue 02's job to walk for the first time. This
issue's skeleton scenario ships first and proves the three steps it walks before any of them is
deepened. The remaining seven scenarios are the log's arrival state and
tightly-coupled variations of "being greeted, one or more times" (oldest-first ordering across
three greetings — the smallest count that rules out a fixed-size window — with the on-screen
greeting doubling as the log's own newest entry, the same name producing two entries, trimming
carrying through to the entry text, a blank submission touching neither the greeting nor the
log when there is already an entry, a whitespace-only submission doing the same, and a blank
submission on a log that is still empty leaving it exactly as it was) — not a deepening in the
story-map sense, since none introduces a different outcome shape
(an entry appended, or deliberately not) — so they ship in this same issue (see feature.md, Story
map).

Note on the greeting log's two DOM shapes: while empty (before the first greeting), no element
with role `list` is present and the region contains an element whose text is exactly "You have
not been greeted yet." (not the region's whole text, which also includes its own heading); while
non-empty, entries are an ordered list (`role="list"`, i.e. a native `<ol>`) of list items
(`role="listitem"`, i.e. `<li>`), oldest first, each holding the trimmed **Name** alone, matched
**exactly**: `expect(items[i].textContent.trim()).toBe(name)` (equivalently,
`expect(items[i]).toHaveTextContent(new RegExp('^' + name + '$'))`) — never
`expect(items[i]).toHaveTextContent(name)` alone, which is a substring match under jest-dom and so
would also pass against "Hello, Ada" for an entry expected to read "Ada"; there is no `{ exact:
true }` option on `toHaveTextContent`, so that form is not a way to fix it either. Never the full
"Hello, `<name>`" sentence, and the empty message text is gone once the log is
non-empty. See feature.md, Contract vocabulary ("The greeting log's two DOM shapes"), and the
seed's own Decisions ("An empty log says so in words").

Note on document order: "the greeting log follows the status region in document order" means
`expect(statusRegion.compareDocumentPosition(logRegion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()`
— the DOM-observable consequence of the seed's agreed placement ("below the greeting"); see
feature.md, Contract vocabulary and Out of scope ("visual (CSS) position").

Note: the greeting log region is present in the DOM from the first render and never removed,
exposed as `role="region"` with the accessible name "Greeted this visit", realized by a visible
`<h2>Greeted this visit</h2>` the region references via `aria-labelledby` (not an `aria-label`
with no visible text). "The greeting log is present" means
`expect(screen.getByRole('region', { name: 'Greeted this visit' })).toBeInTheDocument()`, and "a
heading reads 'Greeted this visit'" means
`expect(screen.getByRole('heading', { name: 'Greeted this visit' })).toBeInTheDocument()` — the
same element satisfies both.

Non-regression note (not new acceptance criteria): `greet-visitor`'s existing constraint test
(`never writes to web storage`, `src/GreetingScreen.test.tsx`) and its fresh-visit guard slice
must keep passing unmodified as this issue is built.

## Acceptance criteria

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

Note on the last scenario above: the two blank/whitespace scenarios before it both start from a
log that already has one entry, so no scenario in this issue pins the cell where the very first
submission of the visit is blank *and* the log is still empty. Without it, an implementation that
(wrongly) creates the clear control the moment any submission is attempted — rather than the
moment an entry actually lands — would pass every other scenario in this issue. "The clear
control is not present" is the Contract vocabulary term this feature defines once and issue 02
exercises for the first time; using it here does not pull issue 02's work forward, it only closes
a gap in this issue's own "blank submissions never touch the log" guarantee.

Note on the tab scenario: matching `greet-visitor`'s own precedent, the value is entered via
`user-event`'s paste (not a literal Tab keystroke, which would move focus rather than insert a
character, and not a raw DOM value assignment) so the
behaviour under test is what the field contains, not how it got there. A space-only scenario would
be satisfied by an implementation that strips only the space character; the tab-based scenario
pins **Trimmed** to `String.prototype.trim()` semantics.

Note on the whitespace-only scenario: **Blank name** (carried unchanged from `greet-visitor`) is
"empty, or whitespace only, after trimming" — the empty-field scenario alone does not exercise the
whitespace-only half of that definition. An implementation that keys the append off the raw field
value instead of the trimmed one would append a blank entry for "   " while still passing every
other scenario in this issue; this scenario is what catches it.

Note on the three-greeting ordering scenario: three is the smallest entry count that distinguishes
append-only growth from a fixed-size window that silently drops the oldest entry — two entries
cannot tell those apart. The same scenario also asserts the seed's Decisions ("The current
greeting is an entry") directly, so no separate scenario is needed for it.
