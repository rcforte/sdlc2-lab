# Verify with human — saved-name

Append-only log of decisions taken under caveat by an sdlc2 node when the graph could not (or
should not) settle a question alone. Each record documents the issue, the options considered, the
decision taken so the graph can keep moving, the rationale, the risk if that decision is wrong,
and what would change it. Do not edit or remove earlier entries — append new ones.

---

## VH-01 — `po`-proposed copy: the Saved name region's text once a name is saved

**Issue.** The seed fixes the empty state ("No name saved yet.") and the hint ("Saved: <name>")
as Agreed copy, but does not literally spell out what the Saved name region itself shows once a
name *is* saved. `feature.md`'s Contract vocabulary picks the hint's own string, reused verbatim
("Saved: Ada"), rather than inventing a sixth phrase — but that choice was made by the `po` node,
not agreed with a human, and this feature family's own precedent (`greet-visitor` VH-01, VH-03)
is that `po`-authored copy is flagged unconfirmed until a human signs off.

**Decision (unconfirmed).** The region's text when a name is saved is `Saved: <name>` — identical
to the hint. `feature.md`, `mockup.html` and every issue file use this string and are marked
`po-proposed, unconfirmed` by this record.

**Rationale.** One phrase, reused, is consistent with the seed's own "the hint presupposes a saved
name" fact — both are two places the same one fact is shown — and invents no new copy the seed
never agreed to. The alternative (a distinct phrase, e.g. "Currently saved: Ada") was rejected as
inventing a sixth string where the seed supplied five.

**Risk if wrong.** Low. If a human prefers the region and the hint to read differently, every
scenario that asserts "Saved: <name>" for the region changes together (they are the *same*
literal string used in two Contract-vocabulary-defined places), and no scenario's pass/fail logic
changes shape — only the literal text substituted into it.

**What would change my mind.** A human stating a distinct preferred string for the region's
saved-state text, separate from the hint's.

---

## VH-02 — Screen-reader check: the Saved name region's announcements

**Issue.** The seed requires the Saved name region to be a "polite live region" that "announces
the region's new content", including on an identical replace (Story 4's "saving the same name
again still replaces it"). Whether an announcement is actually spoken, and whether an attribute
carrying `aria-live="polite"` with no ARIA role (deliberately **not** `role="status"` — see
`feature.md`'s Contract vocabulary, "Announced", for why this feature does not reuse
`greet-visitor`'s `role="status"` **Status region**) is announced as reliably by assistive
technology as a `role="status"` region would be, is not observable under Vitest/jsdom. No
scenario in `feature.md` asserts it directly — every scenario asserts only the testable half (the
attribute is present; the visible text is correct).

**Decision.** Ship the testable half now; flag actual audible re-announcement as a human check,
following the precedent `greet-visitor`'s VH-10 set for the identical situation on the greeting
status region.

**Named check — run against the dev server with NVDA, VoiceOver or Orca active, once issues 01
and 04 are built:**

- **VH-02 (a)** — be greeted, then activate "Save this name". Confirm the region is announced
  once, reading "Saved: Ada".
- **VH-02 (b)** — with "Ada" already saved, be greeted "Grace" and activate "Save this name"
  again. Confirm the region announces the **replacement** ("Saved: Grace"), not silently — the
  region's Ada-to-Grace change is heard.
- **VH-02 (c)** — with "Ada" saved, be greeted "Ada" again (so the greeting is unchanged) and
  activate "Save this name". Confirm the region announces **again** even though the text is
  identical to what it already read (seed: "Saving the same name a second time announces again
  rather than falling silent") — this is the check that decides whether `aria-live="polite"`
  alone, without `role="status"`, re-announces an unchanged string as reliably as `greet-visitor`'s
  keyed `role="status"` region does.
- **VH-02 (d)** — during (a)-(c), confirm the greeting status region is **not** re-announced by a
  save — saving is not a greeting, and the two live regions must not cross-announce each other.
- **VH-02 (e)** — with the field's accessible description "Saved: Ada" present, tab to the Name
  field. Confirm the screen reader reads the hint as the field's description.

**Risk if wrong.** If (c) is silent, the developer's chosen mechanism for a keyed re-render (or
equivalent) is not working on a bare-attribute live region the way it does on `role="status"`; the
fix is a developer concern (a stronger re-render key, or reconsidering the "no `role=\"status\"`"
call above against the cost of re-scoping `greet-visitor`'s existing bare `getByRole('status')`
assertions), not a change to any scenario's pass/fail logic.

**What would change my mind.** VH-02 (c) failing under a real screen reader — that would reopen
the "Announced" Contract vocabulary entry's choice of a bare `aria-live` attribute over
`role="status"` with a renamed `greet-visitor` Status region, weighing the reopened cost against
the failure.

**Status: STILL OPEN** — needs a real screen reader; not yet performed.

---

## VH-03 — Slice 04 needs slice 02's control, but is not blocked by it

**Issue.** Issue `04-replace-the-saved-name` declares `Blocked by: 01-save-the-greeted-name`, and
its subject genuinely is issue 01's (one slot, replaced silently). But one of its steps names a
control that issue 01 does not introduce:

> `And the only buttons inside the Saved name region are "Save this name" and "Greet me again"`

"Greet me again" arrives with issue **02**. In a serial run (01 → 02 → 03 → 04 → 05) this is
invisible, because 02 has always landed by the time 04 is built. In a **parallel lane run** — which
this repo's `CLAUDE.md` explicitly unlocks by declaring an `install` command — issues 02, 03 and 04
all unblock together off 01, and slice 04's lane would go red for a reason that has nothing to do
with replacing a saved name.

**Options considered.** (a) Edit issue 04's `Blocked by:` line — **out of this node's mandate**, and
it would also mean the architect quietly rewriting the `po` node's queue. (b) Let the developer
scope the assertion down to one button when 02 has not landed — that changes an acceptance
criterion's meaning in code, which is worse than changing it in prose. (c) Declare the stricter
build order in the design and in this node's `slices[].blockedBy`, and leave every file the `po`
node owns untouched.

**Decision (unconfirmed).** Option (c). `design.md` §5 carries a "Build-order note for slice 04",
ADR-0025 records it, and this node reports slice 04 as blocked by **01 and 02**. No issue file, no
acceptance criterion and no line of `feature.md` is edited.

**Rationale.** The dependency is real but one-directional and cheap: it costs a little parallelism
(04 waits for 02, which it would in the agreed release order anyway) and it removes a lane failure
that would otherwise be diagnosed as a defect in slice 04's own work. The seed's "what depends on
what" section is about *domain* facts, and by that standard the queue is right — replacing genuinely
needs nothing from greeting again. The dependency is an artefact of one scenario choosing to enumerate
the region's buttons as its way of asserting "no confirmation dialog and no undo control appeared",
which is a good assertion that happens to touch a sibling slice's DOM.

**Risk if wrong.** Low. If a human prefers maximum parallelism, the alternative is to build 04
concurrently and accept one step failing until 02 merges — which the graph would surface as a red
slice rather than a silent gap. Nothing about the design changes either way.

**What would change my mind.** A human confirming that lanes never run 02 and 04 concurrently
(then the extra edge is harmless but unnecessary), or preferring that issue 04's `Blocked by:` line
be amended at source by the `po` node instead.

**Status: OPEN** — decided by the architect node so the graph keeps moving; needs a human to confirm
the queue edge rather than the design note.

---

## VH-04 — `ux` round 2: the first save's announcement includes a newly-inserted control

**Issue.** `feature.md`'s Contract vocabulary (see "Saved name region", "Announced") fixes
`aria-live="polite"` directly on the outer `role="region"` element, not on an inner paragraph. On
the very first save (the SAVEABLE &rarr; SAVED transition — Story 1, s1b &rarr; s1c), the same DOM
mutation that changes the region's text from "No name saved yet." to "Saved: Ada" also inserts
"Greet me again" as a new child of that same live region for the first time (Story 2's own AC:
"The greet-again control appears once a name is saved"). A `polite` live region with no `role`
commonly announces its whole new content when it re-renders, which on this one transition is not
only the paragraph's text but also the newly-inserted button. VH-02 already opens the general
question of whether this bare-attribute region re-announces as reliably as `role="status"` would;
this record adds one more concrete sub-check to that same open human pass, specific to the one
transition where the region's children change shape, not just its text.

**Decision.** Do not restructure the DOM to scope `aria-live="polite"` down to an inner paragraph
only (that would split the region and the hint away from sharing one attribute contract, and
`feature.md` fixes the attribute on the region element itself). Instead, extend the existing VH-02
human pass with one more named sub-check.

**VH-02 (f)** — with nothing saved, be greeted, then activate "Save this name" for the very first
time (the only save that also inserts "Greet me again" as a new child of the region). Confirm and
record what is actually announced — "Saved: Ada" alone, or "Saved: Ada, Greet me again" (the
button's own name folded in) — as the accepted announcement text for this one transition.

**Rationale.** The mockup (`mockup.html`, section 6, "Live region politeness") already documents
this as an accepted, known shape rather than a defect to design around; a human confirming the
actual wording closes the last open question without reopening the Contract vocabulary's choice of
where the `aria-live` attribute lives.

**Risk if wrong.** Low — whichever way VH-02 (f) reads, no scenario's pass/fail logic changes; only
what a screen-reader user actually hears on that one transition is recorded.

**What would change my mind.** A human finding the folded-in announcement confusing or unusable in
practice — that would reopen the "scope the live region to the paragraph only" option this record
declined, and with it the Contract vocabulary's "Announced" entry.

**Status: STILL OPEN** — needs a real screen reader; not yet performed. Runs alongside VH-02 (a)-(e).

---

## `ux` node — arbiter (DECIDE) round index

> Appended by the `ux` node's arbiter round after 2 maker/checker rounds did not clear the
> checker. Rows below are owned by the `ux` node and use the `VH-ux-` prefix; no earlier row in
> this file was renumbered, reordered or rewritten.

| id | node | round | score | severity | decision | status |
| --- | --- | --- | --- | --- | --- | --- |
| VH-ux-01 | ux | 2 (arbiter) | not scored — checker never scored the round | critical | Keep the round-2 `mockup.html` as the final ux artifact; the one unresolved defect is an engine/transport failure, not a content defect, so re-verify and finalize rather than rewrite | open |
| VH-ux-02 | ux | 2 (arbiter) | not scored — checker never scored the round | minor | Focus stays on "Greet me again" after activating it (native button default, no `focus()` call anywhere in this feature) — no acceptance criterion covers it, so the `ux` node fixes it | open |

---

## VH-ux-01 — The only unresolved defect is an engine failure, not a design defect

**Unresolved defect, verbatim.**

```json
[{"criterion":"engine","severity":"critical","location":"ux","evidence":"maker agent returned nothing","fix":"produce the required artifacts at the declared paths"}]
```

**Issue.** After two rounds the checker's sole outstanding item is `criterion: engine` —
"maker agent returned nothing". That is not a statement about the experience spec: it says the
`ux` maker's *reply* never reached the engine, so the round could not be scored at all. The
artifact itself is on disk and was written by that same round
(`/home/rcforte/dev/code/sdlc2-lab/.sdlc2/features/saved-name/mockup.html`, 20 labelled screens,
a transition table, a per-screen state matrix, IA/nav model, wireframes, a11y notes and handoff
AC, plus records VH-04 which that round appended to this file). So the graph is in the awkward
position of holding a complete artifact whose maker round is recorded as having produced nothing,
and **no rubric criterion has ever actually been failed on the merits** — none were evaluated.

**Options considered.**

- **(a) Rewrite `mockup.html` from scratch in the arbiter round.** Rejected: it would discard two
  rounds of work that satisfies the node's stated contract (state coverage, flow completeness,
  structural accessibility, IA) in favour of a hastier version written under a deadline, and it
  would break the "exactly one mockup lineage per feature" rule's spirit even while keeping the
  filename.
- **(b) Declare the node blocked and stop.** Rejected outright — the graph does not stall, and
  there is nothing here a human needs to decide before the developer can build.
- **(c) Treat the defect as what its own evidence says it is — a transport failure — re-verify the
  artifact on the merits against `feature.md` myself, close the gaps that self-review finds, and
  return a well-formed structured object this time.** Chosen.

**Decision.** Option (c). The round-2 `mockup.html` stands as the final `ux` artifact. The arbiter
round re-read `feature.md` end to end against it and made four corrections, all additive, none
touching a po-authored screen's markup, copy or state:

1. **Variant labels completed.** The po node's five preserved happy-path screens (s1c, s2, s3, s4,
   s5) carried no `variant-label`; the node's own contract is that *every* variant is labelled
   with the story or AC it serves. Each now carries one, marked `(po happy path, preserved)`.
   Nothing else about those five screens changed.
2. **The state matrix was missing a drawn screen.** 20 screens were drawn but only 19 had a matrix
   row — screen `s2a0` (the saved name and the current greeting disagree — the state the
   ubiquitous language names directly, "greeted as Bob while Ada stays saved") appeared in the
   transition table but not the per-screen matrix. It is now row 7, and rows 7-19 renumbered to
   8-20.
3. **Every row cross-reference re-checked** after the renumber (handoff AC bullets, the "same as
   row N" note), including one that was wrong before the renumber: the "never rendered disabled"
   bullet cited an inaccurate row set and now names the absent rows (1, 2, 13, 19, 20) and the
   present rows (3-12, 14-18) explicitly.
4. **Focus after "Greet me again" fixed in writing** — see VH-ux-02.

The file parses as balanced HTML (checked), and every screen and section named above is present.

**Rationale.** The evidence in the defect (`maker agent returned nothing`) names a channel
failure, and the artifact on disk contradicts the literal reading that nothing was produced.
Re-verifying on the merits and returning properly is the response that both satisfies the fix
instruction ("produce the required artifacts at the declared paths" — they exist, verified, and
are now reported) and leaves the graph strictly better off than a rushed rewrite would.

**Risk if wrong.** If the checker's "returned nothing" actually stood in for "the artifact is
unusable and I could not even summarise it", then this round preserves work a human would have
wanted redone, and the defect will resurface at the `ux-auditor`. Mitigation: the artifact is a
single self-contained HTML file with no code depending on it yet; replacing it later costs one
node's work and nothing downstream, because the developer builds from `feature.md`'s acceptance
criteria, which this mockup illustrates rather than overrides. Where the two ever disagree,
**`feature.md` wins** — stated here so no downstream node has to guess.

**What would change my mind.** A checker (or human) naming a *substantive* rubric failure in
`mockup.html` — a missing state, an undesigned error path, a broken flow, an IA claim that
contradicts `feature.md`. That is a content defect and would be fixed on its own terms; the
engine criterion as filed is not one.

---

## VH-ux-02 — Focus after "Greet me again" is unspecified by every acceptance criterion

**Issue.** `feature.md` fixes focus behaviour for **saving** and only for saving: "Saving does not
move focus. The save control survives its own activation" (seed, Agreed scope), asserted by Story
1's "Saving does not move focus" and again by Story 4's identical-replace scenario. **No
acceptance criterion anywhere says where focus goes after the visitor activates "Greet me
again."** Story 2's scenarios assert the greeting, the alert clearing, the untouched field and the
unchanged saved name — never focus. But screen `s2d` in `mockup.html` draws "Greet me again" with
the focus ring still on it after activation, which is a design claim the contract does not make.
Left unstated, a developer could equally reasonably move focus to the status region so the new
greeting is read out, and that choice would pass every existing test.

**Options considered.**

- **(a) Move focus to the status region after greeting again**, so the new greeting is definitely
  perceived. Rejected: the status region is already a live region and announces itself
  (`greet-visitor`'s own R9/VH-09 precedent — a keyed re-render makes even an unchanged greeting
  re-announce), so focus-moving buys nothing an announcement does not already deliver, and it
  strands a keyboard visitor away from the control they just used and may want again.
- **(b) Leave it genuinely unspecified** and let the developer pick. Rejected: "unspecified"
  becomes whatever the first implementation happens to do, and it is exactly the kind of thing
  that silently differs between the two controls in the same region — the save button keeping
  focus while the greet-again button loses it would be an inconsistency nobody chose.
- **(c) Fix it as the same rule saving already has:** focus stays on the activated control,
  because the control survives its own activation. Chosen.

**Decision.** Option (c), recorded normatively in `mockup.html` section 6: focus stays on "Greet
me again"; **no `focus()` call exists anywhere in this feature**, for either control. This is what
a native `<button>` does when nothing takes focus away, so it is the behaviour a developer gets by
writing no focus code at all — the rule is "write none", not "write some". A handoff-AC bullet
states it so a test can assert it (row 11 of the state matrix).

**Risk if wrong.** Low, and low-cost to reverse. If a real screen-reader pass finds that greeting
again from the saved name goes unnoticed (because the visitor's attention is parked on a button in
a region below the status region), the fix is additive — move focus, or make the status region's
re-announcement stronger — and it changes one behaviour, no scenario's structure, and no other
state in the matrix. It also composes with the VH-02 human pass already scheduled: whoever runs
VH-02 (a)-(f) with a screen reader is one keystroke away from checking this too.

**Suggested addition to the VH-02 screen-reader pass** — **VH-ux-02 (a)**: with "Ada" saved and
the greeting reading "Hello, Grace", activate "Greet me again" with a screen reader running.
Confirm the new greeting "Hello, Ada" is announced by the status region *without* focus having
moved, and that focus is still on "Greet me again" afterward (press Enter again — it should greet
again, not do something else).

**What would change my mind.** VH-ux-02 (a) showing the greeting goes unannounced or unnoticed
when focus stays put, or a human stating that greeting again should hand focus to the greeting.

**Status: OPEN** — decided by the `ux` arbiter so the graph keeps moving; a human confirmation is
welcome but nothing downstream is blocked on it.

---

# Human resolutions — 2026-08-23

Appended, not edited: every record above stands as the node wrote it. This section records what a
human decided about each, after the five slices were merged to `main` and with the run's own
evidence available — which the deciding nodes did not have.

Four of the six are **closed**. Two remain open, and both are open for the same reason run 1's
VH-10 is: they need a real screen reader, and nothing at a terminal can substitute.

| id | node | resolution | basis |
| --- | --- | --- | --- |
| VH-01 | po | **CLOSED — confirmed as proposed** | human decision |
| VH-02 | ux | **STILL OPEN** | needs a screen reader |
| VH-03 | architect | **CLOSED — the edge was unnecessary** | refuted by the run |
| VH-04 | ux | **STILL OPEN** | needs a screen reader |
| VH-ux-01 | ux | **CLOSED — the arbiter was right** | confirmed by the engine's own error |
| VH-ux-02 | ux | **CLOSED — confirmed as decided** | human decision |

---

## VH-01 — CLOSED. Confirmed as proposed.

The Saved name region reads `Saved: <name>` once a name is saved — the same string as the hint,
confirmed by a human as agreed copy rather than `po`-proposed.

**Why.** The two are two views of one fact, which is what the seed said they were, and the code
already reflects that: `src/visit.ts:117` is the single place the phrasing exists

```ts
return visit.savedName === null ? null : `Saved: ${visit.savedName}`
```

and both the region and the hint consume it. A distinct second string would have split that one
source in two to say the same thing twice.

The record's "What would change my mind" is therefore not met: no distinct preferred string was
stated. Every `Saved: <name>` assertion in the suite stands as written, and the
`po-proposed, unconfirmed` marking on `feature.md`, `mockup.html` and the issue files is lifted.

---

## VH-03 — CLOSED. The queue edge was unnecessary; the `po`'s issue file was right.

Not a judgement call in the end — **the run refuted the concern before it was raised**.

The record feared that in a parallel lane run, slice 04 would go red because one of its steps
names "Greet me again", which arrives with slice 02. That run happened. Slices 02, 03 and 04 all
unblocked off 01 and their developers started in the same second (23:02:48) in three separate
worktrees. **Slice 04 passed on attempt 1**, review score 0.94, with slice 02 still being built
beside it.

The reason is in slice 04's own test: the closed-list assertion tolerates the absent control by
construction, because it queries rather than gets.

```js
for (const name of permittedRegionButtons) {
  for (const button of screen.queryAllByRole('button', { name })) {
    expect(region).toContainElement(button)   // absent control -> zero iterations
  }
}
```

`queryAllByRole` returns `[]` for a control that does not exist, so the loop is a no-op for
"Greet me again" until slice 02 lands, and the assertion still catches exactly what it was written
to catch — a confirmation dialog, an undo control, or any third button appearing in the region.
The developer wrote the scenario knowing 02 was not on its branch, and said so in a comment.

**Resolution.** No queue edge. `issues/04-replace-the-saved-name.md` stands unamended, including
its `Not blocked by 02 or 03` line. `design.md` §5's "Build-order note for slice 04" and ADR-0025's
corresponding note should be read as **superseded by this record** — left in place, because this
file is append-only and those are the artifacts as produced, but not to be acted on.

**The wider point, filed as SD-07.** The architect declared a `Blocked by:` edge in `design.md`
that contradicted the `po`'s issue file. The engine ignored it and was right to — `baseFor()`
reads `issues/`. But two artifacts of the same run asserted different dependency graphs with only
one of them executable, and had the engine consulted `design.md` instead, **this run's diamond
would have collapsed into a chain** — reproducing SD-01's symptom through a different door, in the
very run built to prove SD-01 fixed. `issues/` should be the single source of truth for the queue,
and a dependency disagreement should be a defect raised against the `po` node, not an edge
declared downstream.

---

## VH-ux-01 — CLOSED. The arbiter's reading was correct, and is now confirmed rather than inferred.

The arbiter judged that the checker's sole outstanding defect — `criterion: engine`, "maker agent
returned nothing" — described a transport failure rather than a content defect, and kept the
round-2 `mockup.html` instead of rewriting it under a deadline.

It was reasoning from the artifact's existence. The engine's own failure record settles it
directly:

```
[ux:make (2/2)] failed: API Error: Connection lost mid-response.
```

The maker's reply was lost in flight. Nothing was wrong with the artifact, and **no rubric
criterion was ever failed on the merits** — none were evaluated, because there was nothing to
evaluate. Option (c) was the right call and the four additive self-review corrections stand.

**Consequence for the run's headline, worth stating plainly.** This run's *only* soft-pass was
manufactured by a dropped connection. `ux` scored 0.79 against a 0.80 bar in round 1 — one repair
round from passing on content — and that repair round is exactly what the transport error
consumed. The node's reported verdict is therefore partly a measure of network luck, and its
score history reads `0.79 → (no score)`, which is indistinguishable in shape from a maker that
genuinely collapsed. Filed as SD-05: a call that fails at the transport layer should be retried
before it is charged a round, and such a round should be reported as `errored`, not `rejected`.

---

## VH-ux-02 — CLOSED. Confirmed: focus stays on the activated control.

Focus stays on "Greet me again" after it is activated, exactly as it stays on "Save this name" —
one rule for both controls in the region, and the rule is *write no focus code at all*.

**Verified in the shipped source, not just accepted:** there is no `.focus()` call anywhere in
`src/`. The behaviour is what a native `<button>` does when nothing takes focus away, so there is
no code to keep correct.

**Why not move focus to the greeting.** The status region is already a live region and
re-announces on every submission, including an unchanged one, by the keyed-child mechanism run 1
established (R9 / VH-09). Moving focus would buy nothing the announcement does not already
deliver, would strand a keyboard visitor away from a control they may want to press again, and
would make two buttons in the same region behave differently for a reason no visitor could infer.

**VH-ux-02 (a) remains queued** with the screen-reader pass below — this record closes the design
question, not the audible one.

---

## VH-02 and VH-04 — STILL OPEN. The screen-reader pass, consolidated.

Both records need assistive technology actually running. They are one pass, not two, and
VH-ux-02 (a) joins them. Run against the dev server (`npm run dev`) with NVDA, VoiceOver or Orca
active. All the code involved is merged to `main`, so the pass can be run now.

| check | what to do | what to confirm |
| --- | --- | --- |
| VH-02 (a) | be greeted, activate "Save this name" | the region is announced once, reading "Saved: Ada" |
| VH-02 (b) | with "Ada" saved, be greeted "Grace", save again | the **replacement** is heard — "Saved: Grace", not silence |
| VH-02 (c) | with "Ada" saved, be greeted "Ada" again, save again | it announces **again** despite identical text |
| VH-02 (d) | during (a)–(c) | the greeting status region is **not** re-announced by a save |
| VH-02 (e) | tab to the Name field with a name saved | the hint is read as the field's **description** |
| VH-02 (f) | the **very first** save only | record what is actually announced — "Saved: Ada" alone, or with "Greet me again" folded in as the button is inserted into the same live region |
| VH-ux-02 (a) | with "Ada" saved and the greeting reading "Hello, Grace", activate "Greet me again" | "Hello, Ada" is announced **without** focus moving, and Enter greets again rather than doing something else |

**(c) is the load-bearing one.** It decides whether a bare `aria-live="polite"` on the region —
deliberately **not** `role="status"`, see ADR-0022 — re-announces an unchanged string as reliably
as `greet-visitor`'s keyed `role="status"` region does. If it is silent, the fix is a developer
concern (a stronger re-render key, or reconsidering the no-`role="status"` call against the cost
of re-scoping run 1's existing bare `getByRole('status')` assertions). **No scenario's pass/fail
logic changes either way** — this is why shipping the testable half was the right call.

**(f) records rather than judges.** Whatever it reads, nothing changes structurally; the mockup
already documents the folded-in announcement as an accepted shape.

**This is the second run in a row to end here.** Run 1's VH-10 is still open for the same reason.
Two features have now shipped their audible behaviour unverified, on the strength of a mechanism
(the keyed child) that no automated test in this repo can observe. That is not a defect in either
feature — it is the honest edge of what Vitest/jsdom can see — but it is worth noticing that the
lab has accumulated a standing debt in exactly one place, and that the debt compounds: run 1's
mechanism is now load-bearing for run 2's region, and nobody has heard either of them.
