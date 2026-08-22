# Verify with human — greeting-log

Append-only log of decisions taken under caveat by an sdlc2 node when the graph could not (or
should not) settle a question alone. Each record documents the issue, the options considered, the
decision taken so the graph can keep moving, the rationale, the risk if that decision is wrong,
and what would change it. Do not edit or remove earlier entries — append new ones.

---

## VH-01 — The clear control's accessible name

**Issue.** The seed's Open questions section says: *"'Clear the list' appeared in the grilling's
sketches and drew no objection, but it was never the question asked, so it is not agreed copy."*
Unlike the heading ("Greeted this visit") and the empty-log text ("You have not been greeted
yet."), which the seed states *were* chosen by the human, the clear control's accessible name is
not agreed. Every acceptance criterion in Story 2 needs one fixed string to assert against
(`getByRole('button', { name: ... })`), so the `po` node cannot leave it blank without leaving
every one of those scenarios untestable.

**Options considered.**
1. Leave the accessible name unspecified in the acceptance criteria (e.g. "a button that clears
   the log"), and let the developer node pick a string. This makes every Story 2 scenario
   untestable as written — a Gherkin `Then` step with no fixed string to assert is not testable,
   which this feature's own rubric (PO-AC) forbids.
2. Adopt "Clear the list" — the phrase the seed itself reports drew no objection in the grilling
   — as a `po-proposed, unconfirmed` string, exactly as `greet-visitor`'s `po` node did for its
   own submit control ("Greet me", VH-03 in that feature) before human confirmation.
3. Invent a different string ("Clear", "Reset", "Start over") not mentioned anywhere in the seed.

**Decision.** Option 2, this round. "Clear the list" is used verbatim in every Story 2 and
Story 3 scenario in `feature.md`, flagged `po-proposed, unconfirmed` in Contract vocabulary and
in Out of scope.

**Rationale.** The seed already surfaces this exact phrase as having been sketched and
unobjected-to; inventing a third, unseen string (option 3) would contradict what shared
understanding does exist, and leaving it unspecified (option 1) fails every scenario that needs
to name the control. Reusing the seed's own candidate keeps the contract testable now while still
being honest that it is not agreed copy — exactly the pattern `greet-visitor` used successfully
for its submit control's name.

**Risk if wrong.** Low. If a human picks different copy, the fix is a one-line string change in
`feature.md`'s Gherkin and in the component — every scenario's structure (role, presence/absence,
what it does) is unaffected.

**What would change my mind.** A single line from a human: the confirmed accessible name for the
clear control. That converts this into ordinary agreed copy and this record is superseded (not
deleted) by a follow-up entry.

---

## VH-02 — No live-region announcement for the greeting log itself

**Issue.** The seed's Decisions section rules out an `aria-live` greeting log directly ("that
would double-announce every greeting alongside the status region"), and its Open questions
section notes the assumption that an appended entry needs no announcement of its own beyond the
status region's existing "Hello, `<name>`" announcement. Both are agreed constraints, not open
questions — but neither is observable as rendered behaviour through the DOM under this repo's
convention (`CLAUDE.md`: assert "behaviour through the rendered DOM... never implementation
details"), so no Gherkin scenario in this feature asserts the presence or absence of an
`aria-live` attribute on the greeting log region.

**Options considered.**
1. Add a DOM assertion checking the log region lacks an `aria-live` attribute. Rejected: an
   attribute's absence is an implementation detail, not user-observable behaviour, and the
   testable question ("is the visitor told when an entry is added, and is it told twice?") is
   whether a screen reader announces it — which no automated test in this seam can hear (the same
   reasoning `greet-visitor`'s VH-10 used for its own re-announcement guarantee).
2. Carry the constraint as prose in Contract vocabulary and Out of scope, and record it here for a
   human to confirm at VERIFY time by listening with a screen reader — mirroring `greet-visitor`'s
   VH-07 (the "text, not colour" constraint's untestable half).

**Decision.** Option 2. See `feature.md`, Contract vocabulary ("No live announcement on the
greeting log itself") and Out of scope.

**Rationale.** Consistent with how `greet-visitor` already handles the one other constraint in
this codebase that is agreed but not DOM-observable: state it explicitly, don't fabricate a test
for it, and put a human check on the record so it is reviewed rather than silently assumed true.

**Risk if wrong.** Low-to-moderate. If a screen-reader user is in practice double-announced (or
never told an entry was added), the fix is confined to the log region's markup — no acceptance
criterion needs to change, since none constrains this either way.

**What would change my mind.** A human, listening with a screen reader at VERIFY time, reporting
that greetings are silently missed or double-announced. That would turn this into a new, testable
requirement in a follow-up round.

---

## VH-03 — Story 2's so-that narrows "the screen" to the log and the greeting

**Issue.** The seed's Agreed scope says clearing returns "the screen to its not-yet-greeted
appearance." Story 2's Gherkin (feature.md) includes a scenario, "Clearing does not dismiss a
pending alert," in which clearing leaves an alert on screen that was never present on first
arrival — so the screen as a whole demonstrably does *not* return to its arrival state; only the
greeting log and the current greeting (the status region) do. Contract vocabulary's
**Not-yet-greeted appearance** entry already narrows the seed's "screen" to "the status region's
state before any greeting this visit" for exactly this reason, but Story 2's own so-that clause
had not been updated to match, so the story's stated benefit and its own acceptance criteria
disagreed with each other.

**Options considered.**
1. Change the scenario instead, so clearing also dismisses any pending alert. Rejected: this
   contradicts the seed's Out of scope ("Changing anything about how blank submissions behave")
   and `greet-visitor`'s own rule that the alert is dismissed only by a subsequent submission, not
   by an unrelated control.
2. Reword Story 2's so-that clause to name what clearing actually restores — the greeting log and
   the current greeting — rather than "the screen."

**Decision.** Option 2. Story 2's so-that in `feature.md` now reads: "so that the greeting log and
the current greeting go back to how they looked before I was greeted at all — not the whole
screen, which may still be showing an unrelated alert or an unsubmitted draft in the Name field."

**Rationale.** The seed's own word "screen" is a shorthand the seed's Decisions section already
narrows once (clearing empties the log and removes the greeting; it says nothing about the alert
or the Name field, both of which the seed's other Decisions bullets explicitly leave untouched by
clearing). Story 2's scenarios were already correct; only the story's prose promise was
overbroad. This is a wording fix that resolves an internal disagreement in the human-agreed text,
not a new behaviour.

**Risk if wrong.** Low. If a human intends "the screen" literally — i.e. clearing should also
dismiss a pending alert — that is a new, additive rule to a currently-out-of-scope area (blank
submission behaviour) and would need its own scenario and its own round.

**What would change my mind.** A human confirming that clearing should also dismiss a pending
alert. That would move "blank submission behaviour" from Out of scope into an explicit new
scenario in a follow-up round.

---

## VH-04 — The clear control's proposed name drifts from the seed's own vocabulary

**Issue.** The seed's Ubiquitous language names the concept a **Greeting log** and explicitly
rejects a synonym ("Not 'history'"), and the region's own visible name (Contract vocabulary) is
"Greeted this visit." VH-01 adopts "Clear the list" as the clear control's `po-proposed,
unconfirmed` accessible name because that exact phrase appeared in the grilling's sketches and
drew no objection — but VH-01, as first written, presented this purely as an unconfirmed-copy
question and did not flag that "list" is a third, different word for the same concept the seed
elsewhere calls a "log." A human confirming "Clear the list" without seeing that observation would
be choosing copy that quietly reintroduces a synonym the seed's own vocabulary discipline exists
to prevent.

**Options considered.**
1. Leave VH-01 as originally recorded, silent on the vocabulary drift. Rejected: it lets the human
   confirm copy that drifts from the feature's own agreed vocabulary without ever seeing that this
   is what they are being asked to confirm.
2. Replace "Clear the list" outright with "Clear the log" or "Clear the greeting log," unilaterally,
   without a human decision. Rejected: `po` does not have the standing to pick copy the seed itself
   says was never the question asked — VH-01 already made that call the right way, this entry only
   adds a fact VH-01 was missing.
3. Append this entry (VH-04), leaving "Clear the list" as the still-current `po-proposed,
   unconfirmed` string everywhere in `feature.md` and `mockup.html` (per VH-01, unchanged and not
   relitigated), but naming vocabulary-consistent alternatives so the human confirming VH-01's copy
   sees the drift and can pick either the sketched phrase or a vocabulary-aligned one.

**Decision.** Option 3. "Clear the list" remains the string carried through every scenario, exactly
as VH-01 decided (VH-01 is not relitigated). This entry adds the observation and two
vocabulary-consistent alternatives for the human to weigh at the same time as VH-01: **"Clear the
log"** or **"Clear the greeting log."**

**Rationale.** VH-01's own "What would change my mind" is a single line from a human with the
confirmed copy; that line should be an informed choice. Surfacing the drift, and naming the
alternatives that would remove it, costs nothing now (no scenario or implementation changes) and
prevents a human from confirming copy that undoes the seed's own "Not 'history'" discipline without
realizing it.

**Risk if wrong.** None from this entry itself — it changes no acceptance criterion. The risk it
mitigates is a human confirming "Clear the list" without knowing an alternative exists that better
matches the feature's own vocabulary.

**What would change my mind.** A human confirming any of the three names ("Clear the list," "Clear
the log," "Clear the greeting log") for the clear control. Whichever is chosen supersedes both
VH-01 and this entry as ordinary agreed copy, and only the string in `feature.md`, `mockup.html`
and the implementation need to move together.

---

## VH-05 — Promoting "Clear the log" to the default proposed accessible name

**Issue.** An adversarial checker (round 4) flagged that, despite VH-04 already naming
"Clear the log" and "Clear the greeting log" as vocabulary-consistent alternatives, VH-01's
original pick — "Clear the list" — was still the string actually carried as the
`po-proposed, unconfirmed` default through every scenario, every Contract vocabulary entry, and
`mockup.html`. That meant the *default* a developer node would build, absent further human input,
was itself the string that undoes the seed's own vocabulary discipline ("Greeting log," "Not
'history'") — VH-04 recorded the drift honestly but did not change what ships by default.

**Options considered.**
1. Leave VH-04 as the last word: name the drift and the alternatives, but keep "Clear the list" as
   the default. Rejected this round: naming a problem without changing the default that ships from
   it does not resolve the underlying vocabulary-consistency concern the checker raised — it only
   documents that the concern exists.
2. Promote "Clear the log" — one of VH-04's own named alternatives, and the closest single-word
   swap to the seed's own "Greeting log" / "log entry" / "Clearing" vocabulary — to the
   `po-proposed, unconfirmed` default everywhere in `feature.md` and `mockup.html`, keeping
   "Clear the list" (the grilling's own sketched phrase) named as the alternative a human may
   confirm instead.
3. Promote "Clear the greeting log" instead. Rejected: functionally equivalent to option 2 for
   resolving the drift, but longer as a button label with no added clarity — "log" alone is
   already unambiguous in context, since the control sits inside the greeting log region itself.

**Decision.** Option 2. "Clear the log" is now the `po-proposed, unconfirmed` accessible name
used throughout `feature.md`'s Contract vocabulary, Out of scope, and `mockup.html`. "Clear the
list" remains recorded (VH-01, VH-04) as the alternative a human may confirm instead. No Gherkin
scenario's Given/When/Then spells out the literal button text — every scenario refers to "the
clear control," an abstraction fixed once in Contract vocabulary — so this change touches exactly
one prose definition plus the mockup's drawn button labels, not the scenarios themselves.

**Rationale.** Between two strings neither of which is human-confirmed, the one that does not
reintroduce a synonym the seed explicitly rejects is the safer default to hand to a developer
node. This costs nothing in scenario coverage (no scenario's pass/fail depends on which string
wins) and removes the risk that an unconfirmed default silently ships vocabulary drift into the
implementation before a human ever reviews it.

**Risk if wrong.** Low, for the same reason VH-01 gave: if a human confirms "Clear the list"
instead, the fix is a one-line string change in `feature.md`'s Contract vocabulary, `mockup.html`'s
button labels, and the implementation — no scenario structure changes either way.

**What would change my mind.** A human confirming "Clear the list" (or "Clear the greeting log")
over "Clear the log." That converts this into ordinary agreed copy and this record is superseded
(not deleted) by a follow-up entry.

---

## VH-06 — Clearing is perceivable by *focus*, not by announcement; whether a screen reader speaks the empty message is unverifiable here

**Issue.** Two things collide once the design is written down. (a) `greet-visitor` shipped **R9**
(`VERIFY-WITH-HUMAN.md` VH-09 there, ADR-0009 here): *every submit must be perceivable… without the
status region being removed, recreated, or left textless once it holds content.* This feature's
Story 2 requires exactly that forbidden end state — clearing returns the status region to
**Not-yet-greeted appearance**, asserted as `toHaveTextContent('')`. (b) The seed's own reasoning
for moving focus is that *"a live region emptying announces nothing"*, and the fix it prescribes is
*"focus moves to the log region, so a screen reader announces the empty state."* Measured on a
throwaway build of this design (design §5.5): clearing **does** mutate the status region, but the
mutation empties it — silence. So the focus move is the whole of the visitor's feedback for
clearing. Whether a screen reader, on receiving focus on a `tabindex="-1"` region, actually speaks
*"You have not been greeted yet."* is **AT-dependent** (NVDA, JAWS and VoiceOver differ on reading a
focused container's contents) and is not observable under the declared seam — jsdom speaks to nobody
and `expect(logRegion).toHaveFocus()` proves only where focus landed.

**Options considered.**
1. Treat R9 as violated by this feature and change the acceptance criterion so clearing leaves some
   text behind. Rejected: it contradicts a human-agreed decision (*"Clearing removes the greeting
   too… it would need a second, different empty message to avoid lying"*) and would invent copy
   nobody agreed. The `po` node's contract is not the architect's to edit.
2. Give the log region `aria-live` so the clear announces itself. Rejected: the seed rules it out
   directly (double-announcing every greeting), and VH-02 already records that decision.
3. Write a jsdom test asserting the announcement. Rejected for the reason VH-02 and `greet-visitor`
   VH-10 already give: it would pass whether or not the mechanism works, which is worse than an
   honest gap.
4. **Scope R9 to submissions** (recorded as R9′ in the design, ADR-0014 amending ADR-0009), keep the
   focus move as the perceivability mechanism for clearing, guarantee the two things the design
   *can* guarantee — a real, named, focusable target and an empty state expressed as **text** rather
   than as an absent container — and put the listening check on the record for a human.

**Decision.** Option 4. The design carries R9′, P6 (`tabIndex={-1}` + `aria-labelledby` on the
region), P11 (focus set imperatively in the clear handler), and ADR-0014. No acceptance criterion
changes; no test is fabricated for the announcement.

**Rationale.** The collision is between an *inferred* generalisation (R9's "never textless" clause,
written when a submission was the only command) and an *agreed* product decision (clearing restores
the arrival state). The agreed one wins, and the inferred one is narrowed to the case it was
actually reasoned about. What remains — does the visitor *hear* anything when they clear — is the
same class of question as VH-02 and `greet-visitor` VH-07/VH-10: real, worth checking, and
checkable only by a human with an AT running.

**Risk if wrong.** Low-to-moderate, and reversible. If the focus move turns out to be silent or
confusing in practice, the fix is confined to the log region's markup and the clear handler — no
acceptance criterion constrains it either way, and no domain rule moves.

**What would change my mind.** A human at VERIFY, with a screen reader running, reporting that
activating "Clear the log" produces no useful announcement (or an unhelpful one). That converts this
into a new, testable-by-a-human requirement — most likely a visually-hidden confirmation or a
revisit of VH-02's no-`aria-live` rule — in a follow-up round.

---

## VH-07 — A one-activation, no-confirm, no-undo destructive control (ux, round 2)

**Issue.** An adversarial checker on the `ux` node (round 2) flagged that the clear control is a
single-activation, irreversible, destructive action — feature.md Out of scope, "Undoing a clear":
*"Once Story 2's clear control is activated, the entries and the current greeting are gone; no
story adds a way to bring them back."* There is no confirmation step (e.g. a second "are you
sure" activation) and no undo, and the control's own accessible name is still `po-proposed,
unconfirmed` (VH-01, VH-04, VH-05). This is a live Nielsen "user control and freedom" risk that no
prior record in this file names directly, even though `feature.md` and `mockup.html` both describe
the behaviour plainly.

**Options considered.**
1. Add a confirmation step (e.g. a second click, or a native `confirm()`) before clearing takes
   effect. Rejected as a unilateral change by the `ux` node: `feature.md`'s Story 2 scenarios
   ("When the visitor activates the clear control / Then the greeting log is empty") already pin a
   single-activation contract with no intervening step, human-agreed via the seed's grilling and
   the `po` node's contract; adding one now would silently contradict every Story 2 acceptance
   criterion without a human decision to do so.
2. Add an undo (e.g. a transient "Undo" affordance after clearing). Rejected: directly contradicts
   feature.md Out of scope, "Undoing a clear," verbatim.
3. Leave the one-activation, no-confirm, no-undo design as specified, and record the risk here for
   a human to weigh at VERIFY time — the same pattern VH-01/VH-02 used for other unsettled
   questions at this size.

**Decision.** Option 3. `mockup.html` §2 (flow caption) and §4 (state matrix, Clear control
"Present" row) now say plainly that clearing is irreversible by design and is not a "way back," so
no reader of the experience spec mistakes the "no dead ends" claim for "no data loss." No new
confirmation or undo step is added to the design.

**Rationale.** At this feature's size (in-memory only, one visit, no account, no persistence — the
seed's own scope), a confirmation step or an undo affordance is additive scope nobody asked for,
and both are explicitly ruled out or never requested by the human-agreed seed and contract. The
honest move is to name the risk plainly rather than silently ship it or silently "fix" it without
authorization.

**Risk if wrong.** Low-to-moderate. If a human decides a one-activation destructive control is too
easy to trigger by accident at this size, the fix is additive — a confirmation step or a brief
"undo" window — confined to Story 2's clear handler; no other story's acceptance criteria move.

**What would change my mind.** A human confirming that a single-activation, no-confirm, no-undo
clear control is acceptable for this feature's size and audience — or, conversely, asking for a
confirmation step or an undo window. Either answer converts this into ordinary agreed scope in a
follow-up round.

---

## VH-08 — The log region's *visible* focus indicator: prescribed by the mockup, ownable by nobody in this repo today (architect, round 3)

**Issue.** VH-06 records that the *audible* half of clearing is a human check. This is the **sighted**
half of the same moment, and it has a different owner. `mockup.html` §5 (Keyboard and focus) makes it
normative: *"The log region, though not tab-reachable, must also show a visible focus indicator when
it receives programmatic focus after clearing — drawn here as `.greeting-log:focus { outline: 2px
solid #1a1a1a; outline-offset: 2px; }`, deliberately `:focus` and not `:focus-visible`, because a
script-driven `.focus()` call on a `tabindex="-1"` element does not match `:focus-visible` in
Chromium — so a sighted keyboard user must still see where focus landed."* The reasoning holds and is
if anything understated: the `:focus-visible` heuristic depends on the visitor's *last* interaction
modality, so activating "Clear the log" **with a mouse** matches it in no browser.

Two facts make this un-shippable inside a behaviour slice without a human saying so. (a) `src/`
contains **no stylesheet, no CSS import and no `className` at all** — not one, across both features
shipped — and both features put *"styling beyond what the existing markup implies"* explicitly out of
scope. (b) The declared seam cannot see CSS: probed against the installed toolchain (design §5.6),
with this design's markup rendered and focus on the region, `getComputedStyle(region).outlineWidth`
is `''`, because Vitest does not process CSS by default. A stylesheet shipped here would be inert in
every test that runs, and a green suite would say nothing about whether the rule works.

**Options considered.**
1. Ship `src/index.css` with the rule plus `import './index.css'` in `src/main.tsx`, in slice 02.
   Rejected *for now*, not on merit: it introduces the repo's first styling artifact, inside a
   feature that excludes styling, and unverifiable at the declared seam. It is also the cheapest
   option to adopt later — one file, one import, no dependency, no component edit.
2. An inline `style` attribute. Rejected — impossible: inline styles cannot express `:focus`, and the
   only inline-able variant is a permanent outline, which claims focus is on the region at all times.
3. Make the region tab-reachable so the browser's own ring applies. Rejected: it contradicts the
   seed and the mockup (the region is deliberately not in the tab order) and still leaves the
   mouse-driven clear undrawn.
4. Ship the DOM hook now (`className="greeting-log"`, the mockup's own selector — one attribute, no
   behaviour), write the CSS rule down verbatim, and name its owner here.

**Decision.** Option 4. Design P6/P12, §5.6, §8 and ADR-0017 carry it. The rule, for whoever adopts
it:

```css
.greeting-log:focus {
  outline: var(--focus-ring-width, 2px) solid #1a1a1a;
  outline-offset: var(--focus-ring-offset, 2px);
}
```

(`--focus-ring-width` / `--focus-ring-offset` are the tokens `greet-visitor/mockup.html` already
fixed; the fallbacks mean a missing definition degrades to `2px`, not to nothing.)

**Rationale.** The requirement is real and the mechanism is settled; what is unsettled is whether
this lab repo takes on CSS at all, and that is a human's call, not an architect's aside inside a
behaviour slice. Naming the owner is the difference between a deferred decision and a dropped one —
and this design would rather state a gap than manufacture a jsdom test that passes whether or not the
indicator exists (the reason VH-02, VH-06 and `greet-visitor` VH-10 all exist).

**Risk if wrong.** Moderate while unanswered, and fully reversible. Between slice 02 landing and this
being answered, a **sighted keyboard visitor** who clears the log sees the entries vanish with no
signal that focus moved — they can still Tab onward from the region, so nothing is unreachable, but
the destination is undrawn. Nothing else in the feature depends on the answer either way.

**What would change my mind.** A human answering "ship the stylesheet here" (adopt option 1 with the
rule above, in one file), or "frontend-design owns styling in this repo" (that node inherits the hook
and the rule verbatim), or "this lab does not take CSS" (delete one attribute — `className` has no
other consumer, which is why it is safe to place now).
