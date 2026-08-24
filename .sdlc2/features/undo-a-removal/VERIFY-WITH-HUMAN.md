# Verify with a human — `undo-a-removal`

Decisions and observations this graph cannot close by itself. Append-only; each record keeps its
number for the life of the feature. Written by the `architect` node (round 1).

Carried in and **not reopened**: the screen-reader passes still open from `saved-name` (VH-02,
VH-04), `remembered-names` (VH-04) and `saved-at` (VH-02, VH-03). VH-02 below continues them for a
control that appears and vanishes inside the same region; it does not restate them.

**No defect is raised against the `po` node this round.** Every issue's acceptance steps were read
against the capabilities available on the branch its own `Blocked by:` line describes. Every control
a scenario activates is either already merged — the Name field, `Greet me`, `Save this name`,
`Greet me again as <name>`, `Remove <name>`, the `Newest first` checkbox — or is `Bring <name> back`,
which each issue that activates it either introduces itself or already has by its own declared
blocker. No step activates a control its branch does not carry. **The queue lives in `issues/` and is
not restated in `design.md`** (design.md §5.5) [SD-07].

---

## VH-01 — The offer's exact words for an unusual saved name

**Severity:** low — a wording judgement in text a screen reader reads aloud, on a control whose whole
value is being pressed without thinking.

This is the seed's own first open question, carried, not reopened. `Bring <name> back` is agreed as
the shape and is what the pre-run grilling settled; the design fixes it as a template in the component
(ADR-0047), interpolating the saved name exactly as `Remove <name>` and `Greet me again as <name>`
already do.

What no test can settle is how it reads for a name the visitor typed that is not a name: a name with
trailing punctuation (`Ada!`), or a whole sentence. `Bring Ada! back` and
`Bring I'll do it later back` are both grammatical accidents of the template.

**Confirm:** (a) the template stands for unusual saved names, or (b) it should be re-shaped (for
example `Bring back: <name>`), which would change one line of JSX and every scenario's expected button
name. No scenario pins wording for such a name today, deliberately.

---

## VH-02 — The screen-reader pass: is the offer heard when it arrives, and silent when it goes?

**Severity:** high — it is the mechanism of two headline requirements, and jsdom can see neither.

Two halves, and they pull in opposite directions.

**Arrival should be heard.** The offer is a node added to the polite Saved names region, which the
removal has just given focus to. The seed wants that: a visitor who cannot see the row vanish is told
what will come back. Whether a real screen reader announces an addition to a region it has just moved
focus into — or swallows it as part of the focus change — is that screen reader's business.

**Ending must be silent.** *"When it ends the control is simply absent on the next render… Nothing is
said, nothing is announced."* The design achieves this by making the ending **not a write at all**:
the offer's availability is derived on render, so no revision moves and no message is cleared
(ADR-0046). The remaining reliance is on `aria-relevant` defaulting to `additions text`, so a
**removed** node is not announced — the same reason the Save button and the sort control already
vanish quietly.

**A distinction worth carrying into the pass.** The merged constraint test *"leaves nothing an
assistive technology can perceive changed by a tick"* remains green and unedited, but it is **not**
proof that this ending is silent: it never leaves an offer standing, and unlike the age readings the
offer is **not** `aria-hidden`. When the held entry ages, a tick really does change the region's
perceivable contents (design.md N19). Nobody should "strengthen" that test by leaving an offer
standing before the tick, and nobody should read its survival as covering this.

**Confirm with a real screen reader:** (a) the offer is announced when it appears after a removal;
(b) nothing is announced when it ages out on a tick; (c) pressing it announces the list with the name
back in it, as a removal already does.

---

## VH-03 — The offer's place: a refusal above it, a sort control below it, rows under both

**Severity:** low–medium — a reading-order judgement, fixed by the mockup and now by the design.

The seed's third open question. Inside the Saved names region the order is: the heading, a standing
refusal, **the offer**, the `Newest first` checkbox, then the empty state or the rows (design.md §4.3,
P28; `mockup.html`, story 02). One acceptance criterion pins part of it — the offer appears before the
first row — and nothing pins the rest, because DOM position is all a jsdom test can see.

Two moments are worth one look at the real screen. **A refusal and an offer stacked together**
(*"Ada is already saved."* above *Bring Bob back*) — two unrelated pieces of feedback in the same
band. And **the emptied list**, where the region reads *No names saved yet.* with `Bring Ada back`
sitting above it: true, and arguably contradictory-looking.

**Confirm:** the order reads as intended in both, or say which should move.

---

## VH-04 — The fifteen-second window at the day-old cutoff, and what "never refuses" is taken to mean

**Severity:** low — unreachable in practice; recorded because it is architecture's own reading of a
seed rule, not the seed's words.

ADR-0043 says the offer is *"either present and certain to work, or absent."* The design makes that
literal in the strongest way available: the control is rendered because `stands(held, now)` was true,
and pressing it re-checks **the same number**, so a visible offer can never be inert (ADR-0047, P29).

The cost is that both readings can be up to one tick period — 15 seconds — behind the wall clock. So
an offer may be pressed just past its day-old mark, and the row it restores then leaves on the next
tick. That is the tick's staleness, already accepted for every age reading and for the fall-off
itself (design.md N17, N20), and it is unreachable in a real visit because a visit dies at unmount.

The alternative — reading a fresh clock inside the press — closes that window and opens a worse one: a
button on screen that does nothing. It was rejected for that reason.

**Confirm:** the trade is the right way round — a control that always does what it says, over a
cutoff enforced to the millisecond.
