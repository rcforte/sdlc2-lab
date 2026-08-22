# The saved name

> Seed for the lab run against sdlc2 0.1.3. The shared understanding below was agreed in a
> grilling before the graph was invoked — it is the thing every downstream node is scored
> against.

## Capability

During a visit, a visitor can save the name they were greeted as, and be greeted that way again
without retyping it. Today every greeting starts from whatever is in the Name field, so being
greeted again as a name used earlier means typing it out again exactly — and a typo greets the
visitor as somebody else without saying so. This gives the visit one name it holds onto
deliberately, a way to use that name, and a reminder of it where the retyping would otherwise
happen.

## Agreed scope

- The visit holds **at most one saved name**.
- A **Saved name** region sits on the greeting screen, below the greeting status region, headed
  **"Saved name"**. It is present from the first render.
- While nothing is saved, the region says so in words: **"No name saved yet."**
- Saving captures **the name the visitor was greeted as** — the greeting currently on screen —
  never what is typed in the Name field.
- The save control therefore does not exist until there has been a greeting. It is **absent from
  the DOM**, not present-and-disabled.
- Saving again **replaces** the saved name. No confirmation, no undo, no warning that something
  is being overwritten.
- The saved-name region is a **polite live region**: saving announces the region's new content.
  Saving the same name a second time announces again rather than falling silent.
- Saving does **not** move focus. The save control survives its own activation, so the visitor is
  left where they were.
- A **"Greet me again"** control greets the visitor as the saved name. It exists only while a
  name is saved.
- **Greeting again is an ordinary greeting.** The status region updates and re-announces even
  when the name is unchanged; a standing blank-name alert clears, because this submission
  succeeded; the Name field keeps the visitor's draft untouched; and the saved name itself does
  not change.
- The Name field carries a **saved-name hint** — visible text reading **"Saved: <name>"**,
  programmatically associated with the field as a description. It is absent while nothing is
  saved.
- When a blank-name alert is on screen at the same time, the field is described by **both**, and
  the **alert comes first**: the error about the submission just made outranks standing context.
- Both controls sit **inside the Saved name region, outside the `<form>`**. Pressing Enter in the
  Name field still greets from the field, exactly as it does today.
- **Blank submissions never touch the saved name.** A blank submission is not a greeting, so
  there is nothing new to save and nothing to remove.
- Agreed copy: heading **"Saved name"**, empty state **"No name saved yet."**, controls
  **"Save this name"** and **"Greet me again"**, hint **"Saved: <name>"**. Control names are
  **fixed** and never contain the saved name.
- Everything is in memory. A **fresh visit** has nothing saved.

## What depends on what

Stated as domain facts, not as a slicing instruction — how this is cut into slices, and what
declares itself blocked by what, is the `po` node's call.

- **Saving presupposes a greeting.** There is nothing to save until the visitor has been greeted,
  so the save control cannot be demonstrated before the greeting exists.
- **Greeting again presupposes a saved name.** There is nothing to be greeted as until something
  has been saved.
- **The hint presupposes a saved name.** There is nothing to hint at until something has been
  saved.
- **Greeting again and the hint need nothing from each other.** Greeting again works correctly
  with no hint anywhere on the screen; the hint is correct whether or not the visitor ever greets
  again. Neither is a step on the way to the other, and demonstrating either one does not require
  the other to exist. They touch different things — one the submission path, the other the field's
  description.

## Out of scope

- **Persisting anything.** No backend, no `localStorage`, no `sessionStorage`, no analytics. Run 1
  shipped a constraint test (`never writes to web storage`) and a fresh-visit guard slice; this
  feature must not be the thing that breaks either. A saved name that survived a reload would be a
  different capability and a different feature.
- **More than one saved name.** A list of saved names is the greeting log — a separate feature,
  already sliced onto unmerged `slice/greeting-log/*` branches. Appending rather than replacing
  would drag in ordering, de-duplication and per-entry removal rules nobody asked for.
- **Unsaving.** There is no control that empties the saved name. Replacing is the only way it
  changes.
- Editing the saved name in place, or saving a name the visitor was never greeted as.
- Copying the saved name into the Name field. Outcomes do not write to the field — run 1
  established that, and its tests guard it.
- Confirming, warning about, or undoing a replace.
- Changing anything about how blank submissions behave.
- Counting saves, timestamping them, or summarising them.
- Internationalisation, and styling beyond what the existing markup implies.

## Decisions

- **Saving captures the greeting, not the field.** Sourcing it from the field would let a visitor
  save a name they had never been greeted as, which makes "greet me again" a lie, and it would
  need its own blank-name rule — duplicating a question run 1 already spent four decision records
  settling. Sourcing it from the greeting reuses the fact the domain already holds, and gives the
  concept a real precondition instead of an invented one.
- **One slot, replaced silently.** Keeping the saved name a scalar is what stops this feature from
  becoming the greeting log, and it is what lets the hint be a single line rather than a list. Last
  write wins, because a confirmation would need an undo, and an undo would need a history.
- **The empty region says so in words.** A bare empty container is satisfied by two different DOM
  shapes, which is the ambiguity run 1's VH-04 was raised to remove. Stating it in text leaves one
  shape and one assertion, and gives the first behaviour something to assert before any greeting
  has happened.
- **A control with nothing to do does not exist.** The save control is absent before the first
  greeting and the greet-again control is absent while nothing is saved — neither is rendered
  disabled. A disabled button is unfocusable and explains nothing about why it cannot be used, and
  an absent one raises no question about what an empty click was supposed to do.
- **The hint is associated description, not a placeholder.** A placeholder vanishes on the first
  keystroke, reads as a value that is not there, and would fight the field's own content — the
  exact confusion run 1 avoided by keeping outcomes out of the field. Visible text with no
  association would leave a visitor focused in the field, who cannot see the screen, unable to
  learn the saved name at all.
- **Alert before hint when both describe the field.** The error about the submission the visitor
  just made outranks a standing piece of context. Fixing the order is what stops the hint from
  quietly changing what run 1's alert sounds like.
- **Greeting again is the same greeting.** It runs the one existing state transition with the
  saved name substituted for the field's draft, so re-announcement, alert clearing and the
  untouched field all follow from rules that already exist. A second, separate transition would be
  a second, subtly different notion of what a greeting is — and would leave "Please enter your
  name." standing directly beneath a fresh "Hello, Ada", saying two contradictory things about the
  same moment.
- **Greeting again does not re-save.** Being greeted is not choosing; the saved name changes only
  when the visitor saves.
- **The region announces; focus stays put.** Saving's entire outcome is a text change somewhere
  the visitor is not focused, which is what a polite live region is for. The double-announcement
  objection that kept the greeting log silent does not apply: the log gained an entry at the same
  instant the status region announced the greeting, whereas saving happens alone with nothing else
  speaking. Moving focus instead — the greeting log's answer to clearing — was rejected because
  clearing *destroyed* the focused control and left the visitor nowhere, while the save control
  survives its own activation.
- **Control names are fixed.** "Save Ada" and "Greet me as Ada again" would say more to someone
  tabbing through out of context, but the same button would then be a different button to
  assistive technology from one moment to the next, and every assertion about it would have to
  interpolate. A stable name keeps one control one thing for the whole visit.
- **The controls sit outside the form.** A `<button>` inside a `<form>` submits it by default, so
  placing them there makes each one a greeting unless explicitly told otherwise — a defect that
  passes a casual reading of the markup and fails only in use. Outside the form, Enter in the Name
  field keeps meaning exactly what it means today.
- **In memory only.** The saved name dies with the visit, like everything else on this screen.

## Ubiquitous language

- **Saved name** — the one name the visit is holding onto, captured from a greeting by an explicit
  act of the visitor. Not the greeting: the visitor can be greeted as Bob while Ada stays saved.
- **Saving** — capturing the name currently being greeted as the saved name.
- **Replacing** — saving while a name is already saved. The previous saved name is gone.
- **Greeting again** — being greeted as the saved name, without retyping it.
- **Saved-name hint** — the description at the Name field naming the saved name.
- **Nothing saved** — the state before the first save, and the state of a fresh visit.

Terms carried over unchanged from the `greet-visitor` feature, used with exactly their existing
meanings: **Visitor**, **Name**, **Greeting**, **Blank name**, **Trimmed**, **Fresh visit**,
**Status region**, **Alert**.

## Open questions

- **Whether an identical replace should be silent.** Saving the same name twice currently
  announces again, for consistency with run 1's re-announcement rule. The opposite reading — that
  nothing changed, so nothing should be said — was not tested against a real visitor.
- **Whether the hint should appear while the visitor is already typing.** As agreed it is present
  whenever a name is saved, including mid-draft, when it is arguably noise.
- **The hint's exact wording.** "Saved: Ada" was chosen in the grilling and drew no objection, but
  it was not stress-tested; the heading, the empty-state text and both control names were chosen
  deliberately and are agreed copy.
- Nothing else material at this size.
