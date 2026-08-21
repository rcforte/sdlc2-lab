# Greet the visitor by name

> Seed for an sdlc2 lab run. The shared understanding below was agreed in conversation before
> the graph was invoked — it is the thing every downstream node is scored against.

## Capability

A visitor can type their name and be greeted by it. Today the app shows a fixed banner and
nothing else; it cannot tell one visitor from another. The point is a first taste of the app
responding to *you* rather than to everyone identically.

## Agreed scope

- One screen. A labelled text input for the name, and a control that submits it.
- On submit with a name, the greeting reads `Hello, <name>` and is announced to the visitor.
- On submit with a blank or whitespace-only name, the greeting does not change and an error
  message explains what to do.
- The name is not persisted anywhere. Reloading the page starts over.

## Out of scope

- Storing, transmitting or remembering the name. No backend, no localStorage, no analytics.
- Accounts, sessions, authentication of any kind.
- Internationalisation of the greeting text.
- Styling beyond what the existing markup already implies. This is a behaviour slice.

## Decisions

- **The greeting is derived, not stored.** It is a function of the submitted name, so there is
  no second source of truth to drift.
- **Whitespace-only counts as blank.** `"   "` is a mistake, not a name; treating it as valid
  would produce `Hello,    ` which helps nobody.
- **The name is trimmed before greeting.** `" Ada "` greets `Hello, Ada`. Leading and trailing
  space is never meaningful here.
- **The error is text, not colour.** It must be readable by a screen reader and by someone who
  cannot distinguish red, so it is a message associated with the input, not a red border.
- **No length limit.** An arbitrary cap would be an invented requirement; nothing breaks
  without one.

## Ubiquitous language

- **Visitor** — the person using the app. Not "user", not "customer"; nobody has an account.
- **Name** — the free text the visitor submits.
- **Greeting** — the rendered `Hello, <name>` message.
- **Blank name** — empty, or whitespace only, after trimming.

## Open questions

- None material at this size. If the greeting later needs to survive a reload, that is a
  separate capability and a separate feature.

---

## Product contract

> Everything below is produced by the `po` node from the agreed scope above. Every decision,
> constraint and exclusion in the sections above is carried into a story, an acceptance
> criterion, or an explicit Out-of-scope line below — nothing is silently dropped.

## Contract vocabulary

> The seed's Ubiquitous language section above is the human-agreed shared understanding; nothing
> was added to it or changed in it. The seven terms below are added here, in the Product
> contract, by the `po` node — they exist so every acceptance criterion below uses one fixed name
> for each screen element instead of each story inventing its own. Three of them go beyond what
> the seed literally fixes (the submit control's accessible name, the alert's text, and the
> status region's behaviour at rest); each was flagged `po-proposed, unconfirmed` and recorded in
> `VERIFY-WITH-HUMAN.md` (VH-03, VH-04). All three are now human-confirmed — see VH-15.

- **Greeting screen** — the one screen this feature adds to: the Name field, the submit control,
  the status region (always present, empty until there is a greeting), and the alert (present only
  when there is an error). Referenced by every scenario's `Given the visitor is on the greeting
  screen`.
- **Name field** — the labelled text input ("Name") the visitor types into. Named in every
  acceptance criterion below, so its label text is fixed here.
- **Submit control** *(accessible name human-confirmed — see VH-15)* — the button
  labelled "Greet me" that submits the Name field. Story 1's acceptance criteria assert this
  accessible name directly (`getByRole('button', { name: 'Greet me' })` under the declared
  frontend seam). "The visitor activates the submit control" means the visitor clicks it (or
  activates it via keyboard while it is focused, per native button semantics); every scenario's
  "activates the submit control" step maps to this one interaction. Whether pressing Enter with
  focus in the Name field *also* submits is a separate open question, not decided by this
  entry — see Out of scope and `VERIFY-WITH-HUMAN.md` VH-01 for the `po` node's proposal and why
  it is flagged for human confirmation rather than settled here.
- **Status region** *(behaviour at rest human-confirmed — see VH-15)* — the single
  element that carries the greeting, exposed with `role="status"`. It is **present in the DOM from
  the first render and stays present**, holding **no text at all** until the first successful
  greeting, and the current greeting from then on. (A blank submission never empties it: if a
  greeting is already there it stays — see Story 2 — and if none is there yet it stays empty.)
  Every scenario that says *"the status region is present and contains no text"* means exactly one observation under
  the declared frontend seam: `expect(screen.getByRole('status')).toHaveTextContent('')` — the
  element resolves, and its text content is empty. Every scenario that says *"the greeting reads
  X"* means `expect(screen.getByRole('status')).toHaveTextContent('X')` on that same element. The
  region is deliberately **not** allowed to be absent-then-created: an ARIA live region that is
  inserted at the same moment its text arrives is unreliably announced by screen readers, which
  would break the seed's "and is announced to the visitor". This pins one DOM shape where an
  earlier round left two open; see VH-04.
- **Trimmed** — `String.prototype.trim()` semantics, i.e. all leading and trailing JavaScript
  whitespace (space, tab, carriage return, line feed, vertical tab, form feed, no-break space and
  the Unicode space separators), not the ASCII space character alone. The seed's "Blank name —
  empty, or whitespace only, after trimming" and "The name is trimmed before greeting" are read
  with this meaning throughout: `"\tAda\t"` greets `Hello, Ada`, and a name made only of tabs is
  blank. Story 1 and Story 2 each carry a tab-based scenario so an implementation that strips only
  the space character fails.
- **Alert** *(text human-confirmed and shortened — see VH-15)* — the error message region, exposed
  with `role="alert"`, tied to the Name field via `aria-describedby`. Its fixed text is "Please
  enter your name." Unlike the status region, the alert is **absent** from the DOM
  whenever there is no error to report — every scenario that says "no element with role \"alert\"
  is present" means `expect(screen.queryByRole('alert')).toBeNull()`.
- **Fresh visit** — arriving at the greeting screen anew, as if for the first time, with nothing
  from a previous visit lingering. Under the declared frontend seam (React Testing Library +
  user-event via Vitest/jsdom), jsdom does not implement navigation or reload, so a fresh visit is
  driven by unmounting and re-rendering the component from its initial state (a fresh mount), not
  by `window.location.reload()`. See Story 4.

## Epic

**Epic: Personalised greeting.** Today the app shows a fixed banner and cannot tell one
visitor from another. This epic makes the screen respond to the visitor who typed a name:
greeting them by it, telling them what to do if they submit a blank name, letting them recover
from that mistake without a reload, and starting clean on a fresh visit — since the greeting is
derived, never stored.

## Story map

Backbone — the visitor's journey through the one screen, left to right:

```
[Arrive at the greeting screen] -> [Enter a name] -> [Submit] -> [See the outcome]
```

**Walking skeleton** (thinnest end-to-end slice — ships first, marked *SKELETON* below):
visitor arrives, types a valid name, submits, sees `Hello, <name>` exposed as a live status
region. One option at every backbone step, proving the whole journey works before any step is
deepened. This is Story 1's first scenario, `Visitor is greeted by the name they typed`.

Story 1 as a whole is that skeleton **plus** the screen's state on arrival (the status region
present and empty, so the greeting that lands in it is reliably announced) and three
tightly-coupled variations of the same "valid name" case: trimming (spaces, and tabs), no length
limit, and replacing a previous greeting. None of these touches a different backbone step or a
different outcome shape (`Hello, <name>` on the live status region) — they are the arrival state
and the name-handling rules for the one path the skeleton already walks, not a deepening in
the story-map sense. They ship in the same story as the skeleton because splitting them out would
leave the skeleton scenario alone unable to prove trimming or re-submission work, both of which
the seed's Decisions section requires before Story 1 can be called done. Stories 2-4 are the true
deepenings: each introduces an outcome the skeleton does not produce at all (an alert, a
same-visit recovery, a clean second visit).

Later slices — each deepens the *"See the outcome"* step (or, for Story 4, the *"Arrive"*
step on a second visit) for a case the skeleton does not cover:

- **Story 2** — deepens the outcome for a blank/whitespace-only name: an alert explains what
  to do, and any greeting already on screen is left alone.
- **Story 3** — deepens the outcome for recovery: after an alert, a corrected submission still
  reaches the greeting, in the same visit, with no fresh load needed.
- **Story 4** — deepens the "arrive" step on a second visit: nothing survives it, because the
  greeting is derived, never stored.

Release order: Story 1, then Story 2, then Story 3, then Story 4. The issue queue's `Blocked
by:` chain reflects each story's real technical dependency, not just the release order: issue 02
needs the greeting from issue 01 (01 <- 02); issue 03's recovery needs the alert issue 02
introduces (02 <- 03); issue 04's two scenarios need a prior greeting (from 01) and a prior alert
(from 02) to exist, but need nothing from issue 03's recovery flow, so issue 04 is blocked by 02,
not 03 (02 <- 04). Issues 03 and 04 are therefore siblings, both unblocked once 02 lands; they are
still built in numeric order because that is the agreed release order, not because 04 needs 03's
state.

## User stories

### Story 1 — Get greeted by name *(SKELETON — ships first)*

As a **visitor**,
I want to type my name and submit it,
so that I see a greeting that responds to me instead of everyone identically.

**Acceptance criteria**

```gherkin
Scenario: Visitor is greeted by the name they typed
  Given the visitor is on the greeting screen
  And the existing heading "sdlc2 lab" is shown
  And the Name field is empty
  When the visitor types "Ada" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And the greeting is exposed as a live status region (role="status")
  And the Name field has an accessible label "Name"
  And the submit control has the accessible name "Greet me"
  And the Name field still contains "Ada"
  And the existing heading "sdlc2 lab" is still shown

Scenario: The status region is present and empty before the first submission
  Given the visitor is on the greeting screen
  And the visitor has not submitted anything yet
  Then an element with role "status" is present
  And that element contains no text
  And no element with role "alert" is present

Scenario: Leading and trailing whitespace is trimmed before greeting
  Given the visitor is on the greeting screen
  When the visitor types " Ada " into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And the Name field still contains " Ada " unchanged (only the greeting is trimmed)

Scenario: Tabs around the name are trimmed too
  Given the visitor is on the greeting screen
  When the visitor enters "\tAda\t" (tab, "Ada", tab) into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Ada"
  And no element with role "alert" is present

Scenario: There is no length limit on the name
  Given the visitor is on the greeting screen
  When the visitor types a 300-character name ("A" repeated 300 times) into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, " followed by those same 300 characters, unmodified
  And no element with role "alert" is present

Scenario: Submitting a new name replaces the previous greeting
  Given the visitor has already been greeted "Hello, Ada"
  When the visitor clears the Name field
  And the visitor types "Grace" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Grace"
  And "Hello, Ada" is no longer shown
```

Two notes on reading these steps, both fixed in Contract vocabulary above so no scenario is open
to interpretation:

- *"an element with role `status` is present / that element contains no text"* is the single
  observation `expect(screen.getByRole('status')).toHaveTextContent('')`, and *"the greeting reads
  X"* is `toHaveTextContent('X')` on that same, always-present element. The region is never
  absent — see **Status region** and `VERIFY-WITH-HUMAN.md` VH-04.
- *"enters"* (as opposed to *"types"*) means only that those exact characters end up in the Name
  field's value; it does not prescribe keystrokes. Under the declared frontend seam a literal Tab
  keystroke moves focus rather than inserting a character, so `user-event`'s paste is the reliable
  way to get a tab into the field. The behaviour under test is what the field contains, not how it
  got there. **Trimmed** in Contract vocabulary fixes the semantics (`String.prototype.trim()`,
  not the space character alone) — see VH-08.

### Story 2 — Be told when the name is blank

As a **visitor**,
I want to see an explanatory alert when I submit without a name,
so that I understand what to do to be greeted.

**Acceptance criteria**

```gherkin
Scenario: Submitting an empty Name field shows an alert and no greeting
  Given the visitor is on the greeting screen
  And the Name field is empty
  When the visitor activates the submit control
  Then the status region is present and contains no text
  And an alert reads "Please enter your name."

Scenario: Submitting a whitespace-only name is treated as blank
  Given the visitor is on the greeting screen
  When the visitor types "   " into the Name field
  And the visitor activates the submit control
  Then the status region is present and contains no text
  And an alert reads "Please enter your name."

Scenario: A tab-only name is treated as blank too
  Given the visitor is on the greeting screen
  When the visitor enters "\t" (a single tab character) into the Name field
  And the visitor activates the submit control
  Then the status region is present and contains no text
  And an alert reads "Please enter your name."

Scenario: A blank submission does not clear an existing greeting
  Given the visitor has already been greeted "Hello, Ada"
  When the visitor clears the Name field
  And the visitor activates the submit control
  Then the greeting still reads "Hello, Ada"
  And an alert reads "Please enter your name."

Scenario: The alert is tied to the Name field
  Given the visitor is on the greeting screen
  And the Name field is empty
  When the visitor activates the submit control
  Then the Name field's aria-describedby attribute references the element with role "alert"
```

The seed's "The error is text, not colour" decision splits into two halves, and neither is
dropped:

- The **testable half** is asserted right here, by the scenarios above: the alert *carries its
  meaning in words* ("Please enter your name.") and is *programmatically associated*
  with the Name field via `aria-describedby`. A screen-reader visitor gets the message and knows
  which field it belongs to, with no reliance on colour.
- The **untestable half** — that no colour-only signal (a red border, red text with no words) is
  used to convey the error — is not observable through the rendered DOM under Vitest + jsdom, so
  no scenario asserts it. It is carried by the seed's Decisions section, by the Out of scope
  section below, by the mockup (which uses neutral chrome only), and by a human check recorded in
  `VERIFY-WITH-HUMAN.md` **VH-07** — so the constraint has somewhere to be reviewed against at
  VERIFY time rather than being an unbacked promise.

"The status region is present and contains no text" (used above and in Stories 3-4) is a single,
unambiguous observation — `expect(screen.getByRole('status')).toHaveTextContent('')` — not a
choice of DOM shapes. An earlier round left it open (region absent *or* present-but-empty both
passing); it is now pinned by the **Status region** entry in Contract vocabulary, because a live
region created at the moment its text arrives is unreliably announced and the seed requires the
greeting to be "announced to the visitor". See `VERIFY-WITH-HUMAN.md` VH-04.

### Story 3 — Recover from a blank-name alert

As a **visitor**,
I want to fix my mistake and get greeted after seeing an alert,
so that I can complete my goal without a fresh page load.

**Acceptance criteria**

```gherkin
Scenario: Correcting a blank submission clears the alert and shows the greeting
  Given the visitor submitted a blank Name field and sees the alert
  When the visitor types "Grace" into the Name field
  And the visitor activates the submit control
  Then the greeting reads "Hello, Grace"
  And no element with role "alert" is present
  And the Name field no longer has an aria-describedby reference to the alert

# (human-confirmed — see VERIFY-WITH-HUMAN.md VH-15)
Scenario: The alert stays until the visitor submits again
  Given the visitor submitted a blank Name field and sees the alert
  When the visitor types "Grace" into the Name field
  Then an alert still reads "Please enter your name."
  And the Name field's aria-describedby attribute still references the element with role "alert"

Scenario: Retrying with a whitespace-only name still shows the alert
  Given the visitor submitted a blank Name field and sees the alert
  When the visitor types "   " into the Name field
  And the visitor activates the submit control
  Then an alert reads "Please enter your name."
  And the status region is present and contains no text
```

The middle scenario ("The alert stays until the visitor submits again") fixes *when* the error
clears: on the next submission, not on the next keystroke. The seed says only that "an error
message explains what to do" — it does not say when the message goes away, so this is the `po`
node's call, not agreed scope, and it is flagged in the Gherkin comment above and recorded in
`VERIFY-WITH-HUMAN.md` **VH-05**. It is kept (rather than left unconstrained) because every other
piece of this slice is submit-driven — the greeting only changes on submit, the alert only appears
on submit — and because a message that vanishes mid-correction takes the explanation away while
the visitor is still acting on it. Reversing it is one scenario and one condition.

### Story 4 — A fresh visit starts clean

As a **visitor**,
I want a fresh visit to start from a clean screen,
so that nothing from a previous visit lingers when I arrive again.

This story deepens the *Arrive* backbone step on a second visit, and it is Valuable in its own
right, independent of Stories 1-3: a returning visitor must never see another visit's name,
greeting, or alert. It also constrains an implementation choice that Story 1 alone leaves open —
whether the greeting/alert state lives in component-local React state (naturally discarded when
the component unmounts) or is lifted somewhere that survives a remount, such as a module-level
variable or an accidental write to `localStorage`/`sessionStorage`. Both of those are
plausible-but-wrong ways to satisfy Story 1's "Hello, <name>" scenarios in isolation. If this
story's scenarios fail, the required fix is user-visible and testable: move the state into the
component so it resets on every fresh mount, or remove the storage write — not add bespoke
"reset" logic layered on top of state that should never have leaked.

Note on the seed's literal claim ("Reloading the page starts over"): under the declared frontend
seam, jsdom does not implement navigation or reload, so "starts a fresh visit" below is driven by
unmounting and re-mounting the component (see Contract vocabulary, Fresh visit). Actual
reload-survival (or non-survival) in a real browser is not exercised by this suite; it is recorded
for a human to confirm at VERIFY time (see `VERIFY-WITH-HUMAN.md`, VH-02).

**Acceptance criteria**

```gherkin
Scenario: A fresh visit after a greeting starts from a clean screen
  Given the visitor typed "Ada" and was greeted "Hello, Ada"
  When the visitor starts a fresh visit
  Then the Name field is empty
  And the status region is present and contains no text

Scenario: A fresh visit after an alert starts from a clean screen
  Given the visitor submitted a blank Name field and sees the alert
  When the visitor starts a fresh visit
  Then the Name field is empty
  And no element with role "alert" is present
  And the status region is present and contains no text
```

Implementation note for the developer node: "starts a fresh visit" is the Contract vocabulary
term defined above (Fresh visit). Under the declared frontend seam (React Testing Library +
user-event via Vitest/jsdom), jsdom does not implement navigation or a page reload, so this step
is driven by unmounting and re-rendering the component from its initial state (a fresh mount),
not by `window.location.reload()`.

**Constraint carried outside the scenarios — no storage write.** An earlier round added a fifth
step to each scenario above ("no value was written to localStorage or sessionStorage during the
visit"). It has been removed: it was the only step in this contract that could not be observed
through the rendered DOM, which contradicts this repo's authoritative convention (`CLAUDE.md`:
tests assert "behaviour through the rendered DOM — roles and accessible names, never
implementation details"), and its observation window ("the visit") was never defined. The
guarantee itself is not dropped — it is carried three ways: the seed's Out of scope ("No backend,
no localStorage, no analytics"), this contract's Out of scope below, and the two scenarios above,
which fail for any storage write that is ever read back (as it must be, for stored state to reach
the visitor). A write that is never read is invisible to the visitor and is caught by code review,
not by this suite. See `VERIFY-WITH-HUMAN.md` **VH-06**.

## Out of scope

- **Storing, transmitting or remembering the name.** No backend call, no `localStorage` or
  `sessionStorage` write, no analytics event. Story 4 proves the *visible* effect — a fresh visit
  starts from a clean screen because the greeting is derived, not stored — and fails for any
  stored state that reaches the visitor. The stricter "not one byte is ever written, even if never
  read" half is a code-review check, not an acceptance step, because it is not observable through
  the rendered DOM (see Story 4's constraint note and `VERIFY-WITH-HUMAN.md` VH-06). No story
  implements a storage mechanism.
- **Accounts, sessions, or authentication of any kind.** The visitor has no identity beyond the
  text they type into the Name field; no permission or role-based scenarios apply to this slice.
- **Internationalisation** of the greeting text or the alert text. Both are fixed English
  strings; no locale switching is in scope.
- **Styling beyond what the existing markup already implies.** This is a behaviour slice — no
  new visual design, colour system, or layout beyond what's needed to render the Name field,
  the submit control, the greeting, and the alert. In particular, **no colour-only signal for the
  alert.** The seed's "error is text, not colour" decision is split, not dropped: the half that
  *is* DOM-observable — the alert carries its meaning in words, and is tied to the Name field via
  `aria-describedby` — is asserted by Story 2's scenarios. Only the "no colour-only signal" half
  (a red border or red text with no words would violate it) is not observable under Vitest +
  jsdom; it is verified by human review at VERIFY time against `VERIFY-WITH-HUMAN.md` **VH-07**,
  which exists precisely so that review has a record to check.
- **A length limit or truncation on the name.** Deliberately absent — see Story 1's
  "no length limit" scenario. No story adds a cap later in this slice.
- **Editing or deleting a greeting via a dedicated control.** The only way to change what's
  shown is to type a new name and submit again (see Story 1's "replaces the previous greeting"
  scenario); there is no separate clear/delete affordance.
*(Removed from Out of scope: **submitting by pressing Enter while focus is in the Name field**.
A human resolved VH-01 in favour of adopting it — see `VERIFY-WITH-HUMAN.md` VH-15. The Name
field and submit control now sit inside a native `<form>`, and Story 1 carries a scenario
asserting that Enter in the field greets. Every other scenario's "the visitor activates the
submit control" step still means interacting with the submit control itself.)*
