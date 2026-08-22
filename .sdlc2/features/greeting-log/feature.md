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
