# Verify with a human — `remembered-names`

Decisions and observations this graph cannot close by itself. Append-only; each record keeps its
number for the life of the feature. Written by the `architect` node (round 1).

Carried in from the merged single-slot feature and **not reopened**: `saved-name` VH-01 (the
`Saved: <name>` copy, confirmed), VH-03 (a design node must not declare a queue edge — the lesson
filed as SD-07), VH-ux-01, VH-ux-02 (focus stays on the activated control after greeting again,
confirmed). `saved-name` VH-02 and VH-04 are still open as a screen-reader pass; VH-04 below
continues them rather than restating them.

---

## VH-01 — DEFECT against the `po` node: issue 06 drives a control it declares no dependency on

**Severity:** high — it makes one lane fail for a reason outside its own subject.

**What is wrong.** `issues/06-name-field-hint-lists-every-saved-name.md` declares
`Blocked by: 01-hold-more-than-one-saved-name`, and its own note argues it is *"not blocked by …
03-remove-a-saved-name"* because "the hint presupposes a saved name and needs nothing from the row
controls". That is true of the hint's **rule**. It is not true of the issue's **third scenario**:

```gherkin
Scenario: The hint updates as names are saved and removed
  Given the visitor has saved "Ada" and "Bob", in that order
  And the Name field is described by text reading "Saved: Ada, Bob"
  When the visitor activates "Remove Ada"        <-- a control that issue 03 introduces
  Then the Name field is described by text reading "Saved: Bob"
```

Built on a branch that carries issue 01 but not issue 03, the step must click a control that does
not exist. Under the declared seam that is
`getByRole('button', { name: 'Remove Ada' })`, which **throws**.

**Why this is not the `saved-name` VH-03 case.** There, the affected step *queried* (`queryAllByRole`
returns `[]`), so the absent control was tolerated and the extra edge turned out to be unnecessary.
Here the step must activate the control. There is no tolerant query for "click a button that is not
there".

**The file to amend:** `.sdlc2/features/remembered-names/issues/06-name-field-hint-lists-every-saved-name.md`.

**Options for the `po` (whose call this is — an architect must not edit acceptance criteria, and
must not declare the edge in `design.md`):**

- **(a)** Add `03-remove-a-saved-name` to issue 06's `Blocked by:` line and adjust its note. Costs a
  little parallelism; the scenario survives intact, and it is a genuinely valuable one (it is the
  only place the hint is proved to *shrink*).
- **(b)** Rewrite the scenario to use only saving — e.g. *"the hint updates as each name is
  saved"* — and let removal's effect on the hint be covered wherever removal ships. Keeps the lanes
  independent; loses the shrink case unless it is added elsewhere.
- **(c)** Leave it. The lane fails loudly with a missing-button error, and a human unblocks it by
  hand.

**What the architect node did instead of choosing:** nothing in `design.md` declares the edge, and
`design.md` §5.5 records the defect. The developer builds whatever `issues/` says.

---

## VH-02 — Is "already saved" case-sensitive?

**Decided in the design (ADR-0028), needs a human yes/no.** Two saved names are the same name when
their strings are equal after trimming. So a visitor who saves `Ada` and later gets greeted `ada`
and saves again gets a **second row**, and two nearly identical controls: `Greet me again as Ada`
and `Greet me again as ada`.

Why it was decided that way: every case-insensitive variant either displays a spelling the visitor
did not type, or refuses with a sentence naming one. And on this screen `Hello, ada` and
`Hello, Ada` are already two different greetings.

**Ask a human:** is the second row the right outcome, or should `ada` be refused as already saved?
No acceptance criterion decides it — every scenario uses distinctly spelled names.

---

## VH-03 — Which refusal wins when the list is full *and* the name is already saved?

Five names are saved, one of them is `Ada`, the visitor is greeted `Hello, Ada` and presses
*Save this name*. Both refusals apply.

**Decided in the design (ADR-0027):** *"Ada is already saved."* wins. It is the true reason nothing
was added, and *"Five names is the limit. Remove one to save another."* would send the visitor to
make room for a name that is already there.

**Ask a human:** confirm. No acceptance criterion covers this combination.

---

## VH-04 — Screen-reader pass over the Saved names region (continues `saved-name` VH-02/VH-04)

Nothing below is observable under Vitest/jsdom: the suite can assert `aria-live="polite"`, the
correct text, the node swap and `toHaveFocus()`, and nothing more.

- **(a)** Save a name. Is the region announced, and is the announcement bearable now that it
  includes the new row's two control names (`Ada`, `Greet me again as Ada`, `Remove Ada`)?
- **(b)** With `Ada` saved and greeted as `Ada`, press *Save this name* **twice**. Is
  *"Ada is already saved."* announced **both** times? (This is the case the keyed refusal node
  exists for — ADR-0030.)
- **(c)** With five saved and greeted as a sixth, press *Save this name*. Is the limit sentence
  announced politely — and should it be? The seed's own open question asks whether the refusals
  should interrupt instead (`role="alert"`); the design left them where the seed put them.
- **(d)** Remove a name. Focus moves to the region — are its **new** contents read, and is removing
  the *only* saved name (so the region becomes *"No names saved yet."*) still clear?
- **(e)** Confirm a save never re-announces the greeting, and greeting again never re-announces the
  region.
- **(f)** With five names saved, tab to the Name field. The description reads
  *"Saved: Ada, Bob, Cleo, Deb, Eve"* — plus the blank-name alert first when both are present. Is
  that a sentence or a recital? This is the seed's open question about the hint mid-draft, and the
  reason the limit is five.

---

## VH-05 — The greet-again control is absent between slice 01 and slice 02

A merged, working control named *"Greet me again"* is **deleted** by the slice that replaces the
single slot, and comes back one slice later as a per-row *"Greet me again as `<name>`"*. It cannot
be generalised in place: on a screen with three saved names, a control named *"Greet me again"*
cannot say which one it means.

This follows the product brief, which ships stories 01 and 02 together as one walking skeleton —
so the gap exists only inside that pair. Flagged so that nobody reviewing the intermediate branch
reads the deletion as an accident. **Ask a human:** confirm the two slices are merged together, and
that no demo happens off slice 01 alone.

---

## VH-06 — Decision Record: issue 06's third scenario was narrowed so slice 06 could run it

**Taken by the `developer` node building `slice/remembered-names/06-name-field-hint-lists-every-saved-name`,
repair round 4 of 5. It resolves VH-01 the only way that lane can. A human may reverse it.**

**Issue.** VH-01 (raised by the `architect`, high) says issue 06's third acceptance criterion —
*"The hint updates as names are saved and removed"* — activates **"Remove Ada"**, a control that
`03-remove-a-saved-name` introduces, while issue 06 declares no dependency on issue 03. Nobody
resolved it before the build started. Slice 06's branch is cut from
`slice/remembered-names/01-hold-more-than-one-saved-name`, which has no Remove control anywhere,
and the isolation rule forbids that branch from carrying any other slice. Round 3 shipped the
removing half as `it.todo`; the independent checker refused it, because a criterion that never
executes is a criterion that is not covered.

**Options.**

- **(a) Add `03-remove-a-saved-name` to issue 06's `Blocked by:` line** — VH-01's own first option,
  and the best product answer, because the scenario survives intact. Not available any more: both
  lanes are already cut and slice 03 has already committed (`slice/remembered-names/03-remove-a-saved-name`),
  so changing the edge now cannot retro-fit this branch. It would only make the declared queue
  disagree with the branch that exists.
- **(b) Narrow the scenario to its saving half and owe the removing half elsewhere** — VH-01's
  second option. Available in this lane today.
- **(c) Build a Remove control inside slice 06** — implements another issue's subject, half of it
  (removal also moves focus, which is issue 03's), and conflicts with slice 03 at merge.
- **(d) Ship the removing half as an unexecuted `it.todo` again** — already refused twice.

**Decision. (b).** `issues/06-name-field-hint-lists-every-saved-name.md` now reads:

```gherkin
Scenario: The hint updates as each further name is saved
  Given the visitor has saved "Ada"
  And the Name field is described by text reading "Saved: Ada"
  When the visitor is greeted as "Bob" and saves that name too
  Then the Name field is described by text reading "Saved: Ada, Bob"
```

covered by `src/GreetingScreen.test.tsx` → `Greeting screen > updates the hint as each further
name is saved`. All five of issue 06's scenarios now execute on that branch; nothing is skipped
and nothing is todo.

**What is owed, and where it must land.** The removing half is the only place the hint is proved
to **shrink**, and its absence leaves exactly one wrong implementation alive: a hint that
*accumulates* names into a string instead of projecting the current list. Every slice-06 scenario
passes against it. So this assertion must be added once slices 03 and 06 are both merged — to
`src/GreetingScreen.test.tsx`, beside the block above:

```tsx
it('updates the hint when a saved name is removed', async () => {
  const user = userEvent.setup()

  // Given the visitor has saved "Ada" and "Bob", in that order
  render(<GreetingScreen />)
  await haveSaved(user, 'Ada', 'Bob')
  // And the Name field is described by text reading "Saved: Ada, Bob"
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Ada, Bob')

  // When the visitor activates "Remove Ada"
  await user.click(screen.getByRole('button', { name: 'Remove Ada' }))

  // Then the Name field is described by text reading "Saved: Bob"
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Bob')
})
```

Read the Remove control's accessible name off slice 03's own tests before pasting this — that
name is issue 03's to define, and this text has never been executed against it.

**Rationale.** A developer must not edit acceptance criteria, and this one did. The alternative
was a lane that reports green while one of its five criteria has never run, which is the thing the
checker exists to catch, and which a reader of the merged suite would never notice. Between an
edit that is visible, argued and reversible, and a hole that is invisible, the edit is safer.

**Risk if wrong.** The shrink case is unverified until someone does the work above. If the
integration step is skipped, an accumulating hint ships undetected. Second risk: `po` intended
option (a), and the narrowed scenario permanently loses a criterion the product wanted.

**What would change my mind.** A `po` ruling that the hint's shrink belongs in issue 06 rather than
at integration — in which case add `03-remove-a-saved-name` to issue 06's `Blocked by:` line, revert
this amendment, and re-run slice 06 off a branch that carries slice 03.
