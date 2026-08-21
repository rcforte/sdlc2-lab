# Verify with human — greet-visitor

Append-only log of decisions taken under caveat by an sdlc2 node when the graph could not (or
should not) settle a question alone. Each record documents the issue, the options considered,
the decision taken so the graph can keep moving, the rationale, the risk if that decision is
wrong, and what would change it. Do not edit or remove earlier entries — append new ones.

---

## VH-01 — Should the Name field / submit control sit inside a native `<form>` (Enter-to-submit)?

**Issue.** The seed's Agreed scope says only "a control that submits it" — it does not say
whether pressing Enter with focus in the Name field should also submit. An earlier round of this
feature's `po` node wrote a definite exclusion ("Enter-to-submit is out of scope, wrap the field
in no `<form>`") directly into the Ubiquitous language section of the seed — a section reserved
for the human-agreed shared understanding, not for `po`-authored product decisions. That was
flagged as a defect: the `po` node does not have standing to add a scope exclusion to the seed
itself, and the exclusion has a real accessibility cost (a native `<form>` gives Enter-to-submit,
and the standard "press Enter after filling a single text field" behaviour, for free).

**Options considered.**
1. Keep the exclusion as the `po` node originally wrote it, inside the seed's Ubiquitous
   language section.
2. Drop the exclusion entirely and require a native `<form>` so Enter-to-submit works.
3. Move the exclusion out of the seed section into the Product contract's Out-of-scope list,
   explicitly labelled as `po`-proposed and unconfirmed, and leave the developer free to choose
   either implementation since no acceptance criterion in this slice tests Enter-to-submit either
   way.

**Decision.** Option 3, this round. The exclusion text has been removed from the seed's
Ubiquitous language section (it now only defines the Submit control's accessible name and what
"activates the submit control" means) and lives solely in the Product contract's Out-of-scope
list, marked `(po-proposed exclusion, unconfirmed — see VH-01)`. No story or scenario asserts
Enter-to-submit behaviour in either direction, so the developer may build the Name field and
submit control inside a `<form>` or not — either satisfies every Gherkin scenario in this slice.

**Rationale.** The seed did not agree to this exclusion; inventing it inside the seed section
would have made the `po` node's own opinion indistinguishable from human-agreed scope, which
undermines the very traceability the Product contract promises. Leaving the implementation choice
open (rather than picking the more restrictive option) avoids forcing an accessibility regression
that nobody asked for, while still not requiring new scope (a `<form>`-based Enter-to-submit
scenario) that nobody asked for either.

**Risk if wrong.** If a human later confirms Enter-to-submit is wanted and the developer chose
not to use a `<form>`, a follow-up slice is needed to add it — low cost, one small change. If a
human confirms it should stay excluded and the developer did use a `<form>`, Enter now submits
when nobody asked for it — also low cost to suppress, and arguably harmless since it matches
native single-field-form behaviour visitors already expect.

**What would change my mind.** A single line from a human: "yes, Enter should submit" or "no,
Enter must not submit." Either answer converts VH-01 into a normal, testable acceptance
criterion in the next round and this record can be superseded (not deleted) by a follow-up entry
noting the resolution.

---

## VH-02 — Story 4 proxies "reload starts over" with a jsdom remount, not a real reload

**Issue.** The seed says literally: "The name is not persisted anywhere. Reloading the page
starts over." The declared frontend seam (React Testing Library + user-event via Vitest/jsdom)
has no navigation or `window.location.reload()` implementation, so Story 4's acceptance criteria
test this by unmounting and re-mounting the component from its initial state, plus an explicit
assertion that no value was ever written to `localStorage` or `sessionStorage` during the visit.
That combination proves the *behaviour* (derived, not stored) but does not exercise an actual
browser reload.

**Decision.** Ship Story 4 as specified (remount + no-storage-write assertions) for this slice,
and record here that a genuine "reload the real page in a real browser and confirm the screen is
clean" check is a manual verification step for a human, not something the jsdom suite can cover
under the declared seam.

**Rationale.** Changing the seam (e.g. adding Playwright) to get a real reload is a disproportionate
cost for one Decision-section line, and would contradict this repo's own CLAUDE.md, which
declares Playwright/Cucumber deliberately out of scope for this lab repo.

**Risk if wrong.** Low — the two proxies (remount, no storage writes) together cover the only
two ways state could leak across a reload in this stack (in-memory module state, or web storage).
A real reload could theoretically also be affected by service workers or cached bundles, neither
of which this feature introduces.

**What would change my mind.** If this capability is ever extended to actually persist
anything (which the seed explicitly defers to a separate future feature), a real end-to-end
reload check would become necessary and the seam question would need to be reopened.

---

## VH-03 — Two literal strings (submit control's accessible name, alert text) are `po`-authored copy, not agreed scope

**Issue.** The seed's Agreed scope says only "a control that submits it" and "an error message
explains what to do" — it does not fix any literal wording. An earlier round of this feature's
`po` node wrote the exact accessible name "Greet me" for the submit control and the exact text
"Please enter your name to be greeted." for the alert directly into the seed's Ubiquitous
language section. That was flagged as a defect for the same reason as VH-01: writing product
copy inside the section reserved for human-agreed shared understanding makes the `po` node's own
invention indistinguishable from something a human actually agreed to, which breaks the
traceability the Product contract promises. Every acceptance criterion in this slice needs *some*
fixed string for both, though — Story 1 asserts `getByRole('button', { name: 'Greet me' })`, and
every alert scenario asserts the alert's text — so the strings cannot simply be deleted.

**Options considered.**
1. Leave the two strings in the seed's Ubiquitous language section, as originally written.
2. Remove both strings and leave every scenario that names them referring to "an accessible
   name" / "explanatory text" without asserting a literal string — which would make the
   acceptance criteria too vague to drive a single failing test per scenario (fails PO-AC).
3. Move both strings out of the seed into the Product contract's new Contract vocabulary
   section, explicitly labelled `po-proposed, unconfirmed`, so the traceability gap is visible
   and a human can confirm or change either string without touching the seed.

**Decision.** Option 3, this round. "Greet me" (Submit control) and "Please enter your name to
be greeted." (Alert) now live only in the Product contract's Contract vocabulary section, each
marked `(po-proposed ..., unconfirmed — see VH-03)`. The seed's Ubiquitous language section is
restored to exactly what was agreed (Visitor, Name, Greeting, Blank name only).

**Rationale.** Concrete strings are needed for the acceptance criteria to be testable at all
(PO-AC requires every step to be observable, not vague), but *which* concrete strings is a
product-copy decision nobody in the seed conversation actually made. Keeping them in the Product
contract, clearly flagged, lets the developer node build against a fixed, testable string today
while leaving the door open for a human to rename either string in one place later.

**Risk if wrong.** Low. If a human later prefers different wording for either string, every
scenario that names it needs a one-line find-and-replace (the string appears verbatim, never
paraphrased, in feature.md and in the matching issue file), and the component's rendered text/
accessible name changes to match. No behaviour, structure, or test strategy changes.

**What would change my mind.** A single line from a human confirming either string, or supplying
a replacement for either. Either answer converts the relevant Contract vocabulary entry from
`po-proposed, unconfirmed` to confirmed, and this record can be superseded (not deleted) by a
follow-up entry noting the resolution.

---

## Index — arbiter round (DECIDE MODE, after round 5)

Five checker defects were still open when the rounds were spent. The `po` node decided each one,
finalized the artifacts, and recorded the calls below. The `score` column is `n/a`: the arbiter
round is not scored, and the round-5 numeric score was not passed to this node.

| id | node | round | score | severity | decision | status |
| --- | --- | --- | --- | --- | --- | --- |
| VH-04 | po | 5 (arbiter) | n/a | high | Status region pinned to one DOM shape: present from first render, empty until there is a greeting | open |
| VH-05 | po | 5 (arbiter) | n/a | medium | Blank-name alert persists until the next submission (it does not clear on keystroke) — `po`-proposed | open |
| VH-06 | po | 5 (arbiter) | n/a | medium | Storage-write step dropped from the Gherkin; no-persistence carried by the remount scenarios plus review | open |
| VH-07 | po | 5 (arbiter) | n/a | medium | "No colour-only error signal" becomes an explicit human VERIFY check; the text/`aria-describedby` half stays testable | open |
| VH-08 | po | 5 (arbiter) | n/a | low | "Trimmed" fixed as `String.prototype.trim()` semantics; tab-based scenarios added to Stories 1 and 2 | open |

---

## VH-04 — The status region is pinned: present from the first render, empty until there is a greeting

**Issue.** Until this round, every "no greeting" outcome was written as "no greeting text is
shown", and a note under Story 2 explicitly blessed *two* DOM shapes as passing: the status region
absent (`queryByRole('status')` returns `null`), or present but empty. That is not one contract —
it is two, and a developer could satisfy the suite either way. The seed says the greeting "is
announced to the visitor", and which shape is built decides whether that is true.

**Options considered.**
1. Leave it open (both shapes pass), and record the ambiguity as a VH entry against the seed's
   "announced" line.
2. Pin the *absent* shape: the region is created when a greeting exists and removed otherwise.
3. Pin the *present-and-empty* shape: the region exists from the first render, holds no text until
   there is a greeting, and is never removed.

**Decision.** Option 3. Contract vocabulary now defines **Status region** with exactly one
observable meaning — "the status region is present and contains no text" is
`expect(screen.getByRole('status')).toHaveTextContent('')`, and "the greeting reads X" is
`toHaveTextContent('X')` on that same element. A new Story 1 scenario ("The status region is
present and empty before the first submission") pins the at-rest state directly, every
"no greeting text is shown" step in Stories 2-4 has been rewritten to the pinned phrasing, and the
mockup now draws the empty region (with its caption *outside* the region, so the region really is
textless). The alert keeps the opposite rule, also stated explicitly: absent when there is no
error.

**Rationale.** This is not merely a tie-break: an ARIA live region that is inserted into the DOM at
the same moment its text arrives is unreliably announced by screen readers — the announcement
depends on the region being observed *before* the mutation. Option 2 would therefore quietly
weaken the seed's "and is announced to the visitor", and Option 1 would leave a coin-flip between a
compliant and a non-compliant implementation. Option 3 is the only choice that makes the seed's
announcement line true by construction, and it is the one shape that is a single assertion to test.

**Risk if wrong.** Low, and it is a *specificity* risk rather than a behaviour risk: the contract
now names a DOM role and its lifecycle, which is closer to implementation than a product contract
usually goes. If a human decides the empty region is unwanted (for example because a styled empty
box shows through the layout), the fix is to keep the region present but visually collapsed when
empty — no scenario changes — or, if they truly want it removed, to revert to `queryByRole` in
five steps and accept the announcement risk.

**What would change my mind.** A human saying the greeting does not need to be announced (then the
region can be created on demand and this record is superseded), or a real screen-reader check
showing the announcement is reliable in this app even when the region is created on submit.

**Unresolved defect, verbatim.**

> **criterion** PO-AC · **severity** high
> **location** `.sdlc2/features/greet-visitor/feature.md:232-236 (note under Story 2, governing Stories 2-4)`
> **evidence** "No greeting text is shown" (used above and in Stories 3-4) is deliberately implementation-
> agnostic: it is satisfied whether the greeting region is absent from the DOM, or present but
> empty — e.g. `queryByRole('status')` returns `null`, or returns an element whose `textContent` is
> empty. Both satisfy the contract
> **fix** Pin the live region at rest with a testable step and stop permitting both shapes. Add to Story 1 (and mirror in issues/01) a scenario such as: `Scenario: The greeting region exists before the first submission / Given the visitor is on the greeting screen / Then an element with role "status" is present / And it contains no text`, then narrow the Stories 2-4 phrasing to "the status region is present and contains no text" (a single `expect(screen.getByRole('status')).toHaveTextContent('')`). If the po node genuinely wants to leave the shape open, that must be recorded as a VH entry against the seed's "announced" line, not silently resolved as "Both satisfy the contract".

---

## VH-05 — The blank-name alert stays until the next submission (it does not clear on keystroke)

**Issue.** Story 3's middle scenario requires the alert to still be present after the visitor
starts typing a correction, clearing only on the next submission. The seed says only that "an
error message explains what to do" — it never says *when* the message goes away. That timing is a
`po` invention, and it was not flagged as one, unlike the far smaller inventions recorded in VH-01
and VH-03.

**Options considered.**
1. Delete the scenario and leave error-clearing timing unconstrained by this slice.
2. Keep the scenario as-is, unflagged (the status quo the checker rejected).
3. Keep the scenario, flag it in the Gherkin as `po`-proposed and unconfirmed, and record the
   options here.
4. Invert it: the alert clears as soon as the visitor types.

**Decision.** Option 3. The scenario stays and now carries the Gherkin comment
`# (po-proposed behaviour, unconfirmed — see VERIFY-WITH-HUMAN.md VH-05)` in both `feature.md` and
`issues/03-recover-from-alert.md`, with prose beside it explaining that this is the `po` node's
call and how to reverse it.

**Rationale.** Deleting it (Option 1) would leave the developer free to clear the alert on the
first keystroke *or* keep it, with no test either way — the same "two shapes, one contract" problem
VH-04 was raised to remove, in a place where the visitor can feel the difference. Keeping it
matches the rest of the slice, which is uniformly submit-driven (the greeting only changes on
submit; the alert only appears on submit), and it avoids taking the explanation off the screen
while the visitor is still acting on it. Flagging it is what makes the decision honest and cheap to
reverse. Option 4 was not chosen because "clear on input" would make the alert vanish before the
visitor's correction has been judged — arguably premature reassurance.

**Risk if wrong.** Low. If a human prefers "clear on input", the change is one scenario (delete or
invert), one line in `issues/03`, and one condition in the component. No other scenario depends on
the alert's persistence: Story 3's first scenario asserts the alert is gone *after* a successful
resubmission, which holds under either policy.

**What would change my mind.** A human saying the error should disappear as soon as the visitor
starts fixing it — a common form-validation preference, and a reasonable one.

**Unresolved defect, verbatim.**

> **criterion** PO-GRILL · **severity** medium
> **location** `.sdlc2/features/greet-visitor/feature.md:255-259 and issues/03-recover-from-alert.md:27-31`
> **evidence**
> ```gherkin
> Scenario: The alert stays until the visitor submits again
>   Given the visitor submitted a blank Name field and sees the alert
>   When the visitor types "Grace" into the Name field
>   Then an alert still reads "Please enter your name to be greeted."
>   And the Name field's aria-describedby attribute still references the element with role "alert"
> ```
> **fix** Either mark this scenario `(po-proposed behaviour, unconfirmed — see VH-04)` and append a VH-04 record to VERIFY-WITH-HUMAN.md stating the options (error clears on input vs. persists until resubmit), the decision taken, and what would change it — matching how VH-01 and VH-03 handled far smaller inventions — or delete the scenario and leave error-clearing timing unconstrained by this slice.
>
> *(Numbering note: the checker's suggested id "VH-04" was already taken by the status-region
> decision above by the time this round ran; this record continues the sequence as VH-05. The
> content of the fix is the content of this decision.)*

---

## VH-06 — The "no localStorage/sessionStorage write" step is dropped from the Gherkin

**Issue.** Both Story 4 scenarios ended with "And no value was written to localStorage or
sessionStorage during the visit". It was the only step in all thirteen scenarios that could not be
observed through the rendered DOM, which contradicts this repo's authoritative convention
(`CLAUDE.md`: every test asserts "behaviour through the rendered DOM — roles and accessible names,
never implementation details"), and its observation window ("the visit") was never defined — first
visit, remount, or both.

**Options considered.**
1. Keep the step and make it precise, e.g. "`Storage.prototype.setItem` was never called between
   the initial render and the end of the scenario" — testable via a spy, but explicitly an
   implementation-detail assertion the repo convention forbids.
2. Drop the step, and let the remount scenarios plus the Out-of-scope sections carry the guarantee.
3. Keep the vague step (the status quo the checker rejected).

**Decision.** Option 2. Both scenarios now end at the user-visible observations (Name field empty,
status region present and empty, no alert). The guarantee itself is restated in three places that
survive: the seed's Out of scope, this contract's Out of scope (rewritten so it no longer claims an
assertion that no longer exists), and a labelled constraint note under Story 4 explaining that the
"not one byte, even if never read" half is a code-review check.

**Rationale.** The remount scenarios already fail for *every* storage write that reaches the
visitor — stored state must be read back to have any effect, and reading it back would repopulate
the field or the greeting after the fresh mount. What Option 2 gives up is only a write that is
never read: invisible to the visitor, harmless to behaviour, and squarely a code-review matter. The
project's own convention is authoritative and unambiguous here; a contract that instructs the
developer to violate it would be resolved by the developer node one way or the other anyway, and it
is better to be explicit about who catches what.

**Risk if wrong.** Low-to-moderate: a stray, never-read write to web storage would now pass the
suite, and the seed forbids it flatly ("No backend, no localStorage, no analytics"). The catch is
human/code review rather than a red test. If that matters more than the DOM-only convention, the
step comes back in the precise form of Option 1 — one line per scenario plus a spy in the test.

**What would change my mind.** A human saying the no-storage rule must be enforced by a test rather
than by review — at which point Option 1's wording is ready to paste in, and the tension with
`CLAUDE.md` should be resolved in `CLAUDE.md` (a carve-out for constraint assertions), not
silently in this contract.

**Unresolved defect, verbatim.**

> **criterion** PO-AC · **severity** medium
> **location** `.sdlc2/features/greet-visitor/feature.md:302 and :310; issues/04-fresh-visit-starts-clean.md:47 and :55`
> **evidence** And no value was written to localStorage or sessionStorage during the visit
> **fix** This step is the only one in all 13 scenarios that is not observable through the rendered DOM, which contradicts this repo's authoritative convention (CLAUDE.md: tests assert "behaviour through the rendered DOM — roles and accessible names, never implementation details"), and "the visit" is undefined — only "Fresh visit" is defined in Contract vocabulary, so in scenario 1 it is unclear whether the window spans the first visit, the remount, or both. Either name the observation and the window explicitly (e.g. `Then Storage.prototype.setItem was never called between the initial render and the end of the scenario`) or drop the step and let VH-02's human reload check carry the no-persistence guarantee, since the remount steps already prove the user-visible behaviour.

---

## VH-07 — "The error is text, not colour": the colour half is a human VERIFY check

**Issue.** The Out-of-scope section promised that the seed's "error is text, not colour" decision
"is verified by human review instead", but no VH record existed for it — so at VERIFY time there
was nothing for a human to review it against, and the constraint could be lost. The same line also
overstated the gap, implying the whole decision was untestable.

**Options considered.**
1. Leave the promise unbacked (the status quo the checker rejected).
2. Try to assert the colour rule in the suite (e.g. computed styles, class-name checks) — brittle,
   and a class name proves nothing about what a sighted visitor perceives.
3. Split the decision explicitly: assert the testable half in Story 2, and record the colour half
   here as a named human check.

**Decision.** Option 3. Story 2's note and the Out-of-scope bullet now say plainly that the
*testable half* — the alert carries its meaning in words, and is tied to the Name field via
`aria-describedby` — is already asserted by Story 2's scenarios, and that only the *"no colour-only
signal"* half rests on human review, against this record. The mockup's intro states the same and
uses neutral chrome only.

**Human check to perform at VERIFY.** Look at the rendered error state and confirm: (a) the message
is conveyed in words, not by a red border, red text, or an icon alone; (b) removing all colour
(greyscale, or a high-contrast/forced-colours mode) loses no information; (c) a screen reader
announces the message and associates it with the Name field.

**Rationale.** A promise of human review with no record to review against is worse than no promise:
it reads as covered and is not. Writing the check down, with the specific things to look at, costs
nothing and makes the constraint survive to VERIFY. Attempting to automate it (Option 2) would
assert the presence of a class name, not the absence of colour-only meaning — a test that passes
while the constraint is violated is worse than an honest manual check.

**Risk if wrong.** Low. The failure mode is cosmetic and reversible: if a colour-only signal slips
in, it is caught at VERIFY and removed. No behaviour, scenario, or structure depends on it.

**What would change my mind.** A human declaring the colour rule fully satisfied by the text +
`aria-describedby` assertions (then this record can be closed as covered), or the project adopting
a visual-regression or forced-colours check that could assert it mechanically.

**Unresolved defect, verbatim.**

> **criterion** PO-GRILL · **severity** medium
> **location** `.sdlc2/features/greet-visitor/feature.md:333-335 (Out of scope, styling bullet)`
> **evidence** it is not
> DOM-observable under Vitest + jsdom, so no acceptance criterion asserts it, and it is verified
> by human review instead
> **fix** VERIFY-WITH-HUMAN.md contains only VH-01, VH-02 and VH-03 — none covers the "error is text, not colour" decision, so the "human review" this line promises has no record to be reviewed against and the constraint can be lost at VERIFY time. Append a VH record for it in the same shape as VH-02 (which records exactly this class of untestable-under-the-seam constraint). Also correct the overstatement: the decision's testable half — the alert carries its meaning in text and is associated with the field via `aria-describedby` — is already asserted by Story 2's scenarios, so only the "no colour-only signal" half needs human review.

---

## VH-08 — "Trimmed" means `String.prototype.trim()`, and tab scenarios enforce it

**Issue.** The seed defines a blank name as "empty, or whitespace only, after trimming", but every
blank/whitespace scenario used ASCII spaces only. An implementation that stripped just the space
character (`value.replace(/ /g, '')`) would pass every scenario and still greet `Hello, \t`.

**Options considered.**
1. Define the trim semantics in Contract vocabulary only.
2. Add a scenario using non-space whitespace only.
3. Do both.

**Decision.** Option 3. Contract vocabulary gains a **Trimmed** entry fixing the meaning as
`String.prototype.trim()` — all leading and trailing JavaScript whitespace (space, tab, CR, LF,
vertical tab, form feed, no-break space, Unicode space separators), not the space character alone —
and two tab-based scenarios were added: Story 1's "Tabs around the name are trimmed too"
(`"\tAda\t"` greets `Hello, Ada`) and Story 2's "A tab-only name is treated as blank too".

**Rationale.** A definition alone can be read and ignored; a scenario alone leaves the general rule
unstated. Together they make the space-only implementation fail and tell the developer why. Tab was
chosen over newline deliberately: an `<input type="text">` value-sanitization strips line breaks, so
a newline-based scenario would silently degenerate into a no-op and prove nothing. The steps say
"enters" rather than "types" — and a note explains that a literal Tab keystroke moves focus, so the
characters should be pasted — because the behaviour under test is what the field contains, not the
keystrokes that put it there.

**Risk if wrong.** Very low, and the risk runs the other way: this is stricter than before, and
`String.prototype.trim()` is the default any idiomatic implementation would reach for. The only way
it bites is if a human wanted some exotic whitespace preserved (a name of no-break spaces), which
the seed's "`\"   \"` is a mistake, not a name" rules out.

**What would change my mind.** A human wanting a narrower notion of whitespace, or wanting the
tab-based cases treated as out of scope for this slice — either way, delete the two scenarios and
narrow the **Trimmed** entry.

**Unresolved defect, verbatim.**

> **criterion** PO-AC · **severity** low
> **location** `.sdlc2/features/greet-visitor/feature.md:208 and :263; issues/02-blank-name-alert.md:35, issues/03-recover-from-alert.md:35`
> **evidence** When the visitor types "   " into the Name field
> **fix** The seed defines "Blank name — empty, or whitespace only, after trimming", but every blank/whitespace scenario uses ASCII spaces only. An implementation that strips only the space character (e.g. `value.replace(/ /g, '')`) passes all 13 scenarios yet greets `Hello, \t`. Either add the trim semantics to Contract vocabulary ("trimmed" means `String.prototype.trim()`, i.e. all Unicode whitespace) or add a step using a tab/newline, e.g. `When the visitor types "\t\n" into the Name field`.

---

## VH-09 — Repeat-identical-outcome resubmits (state matrix rows 4a, 12a) must be perceivable — outcome only, mechanism left open

**Issue.** No acceptance criterion in `feature.md` addresses what happens when a visitor resubmits
to a result that is byte-identical to what is already on screen (submitting the same valid name
twice in a row; failing the same way twice in a row). An `aria-live` region only reliably
re-announces when its DOM content actually mutates, so a naive re-render that sets the same string
risks being silent — the visitor clicks "Greet me" again and gets no feedback their click
registered. This is a `ux`-node-invented requirement, in the same class as VH-01/VH-03/VH-05: no
story or scenario tests it, and it was flagged this round for prescribing a specific DOM mechanism
("clear-then-set on the next tick", "remount the text node/element") rather than stating the
outcome. The prescribed mechanisms were themselves in tension with VH-04's pinned status-region
shape ("deliberately not allowed to be absent-then-created") and, worse, an earlier phrasing
("every submit — success or error") read as requiring the status region to be force-mutated on a
*failing* submit too, which would contradict Story 2's "a blank submission does not clear an
existing greeting" (`feature.md` Story2-S4) by re-announcing a stale greeting as feedback for a
submission that failed.

**Options considered.**
1. Leave repeat-identical-outcome resubmits unconstrained — a visitor could click "Greet me"
   repeatedly with no feedback at all, silently.
2. Prescribe a specific DOM mechanism in the mockup (clear-then-set on a tick, remount the text
   node/element) so the requirement is unambiguous to build against.
3. State the requirement as an outcome only — "every submit must be perceivable to a
   screen-reader visitor, without the status region/alert ever being removed, recreated, or left
   textless once it holds content" — scoped per result (successful resubmit force-mutates only the
   status region; failing resubmit force-mutates only the alert; the other region is never
   touched), and leave the DOM mechanism to the developer/frontend-design node.

**Decision.** Option 3, this round. `mockup.html` state matrix rows 4a and 12a, and section 5,
now state the outcome and its per-result scope only; the "clear-then-set" / "remount" mechanism
language has been removed. The scoping rule is explicit: row 4a (successful repeat) force-mutates
the status region only, never the alert; row 12a (failing repeat) force-mutates the alert only,
never the status region — matching row 9's "a failing submit never touches an existing greeting."

**Rationale.** Option 1 would leave a real usability gap the seed's "announced to the visitor"
line implies should not exist, with no test either way — the same "two shapes, one contract"
problem VH-04 was raised to remove. Option 2 oversteps the `ux` node's boundary (structure and
states, not implementation) and, as written, actively conflicted with VH-04's pinned DOM shape.
Option 3 keeps the requirement (closing the usability gap) while respecting both boundaries: it is
testable as an outcome (the visitor perceives the second click), and it leaves the "how" — a keyed
re-render, a visually-hidden counter, whatever the developer/frontend-design node judges simplest —
genuinely open.

**Risk if wrong.** Low. If a human decides repeat-identical-outcome resubmits do not need to be
perceivable (Option 1), the fix is to delete the requirement from rows 4a/12a and section 5 — no
scenario depends on it, so nothing else changes. If a human wants a specific mechanism mandated
(Option 2), the fix is to add that as a normative note here or in a follow-up scenario, once a
human — not the `ux` node acting alone — has picked one.

**What would change my mind.** A human saying either "no feedback is required on a repeat
identical submit" (delete the requirement) or "here is the exact mechanism to use" (mandate it,
superseding this record's Option 3).

---

## VH-10 — Named human check for VH-09 (rows 4a/12a repeat-identical-outcome perceivability)

**Issue.** VH-09 states the outcome required for rows 4a/12a (a repeat submit whose result is
byte-identical to what is already on screen must still be perceivable to a screen-reader visitor)
but, unlike VH-07, never named a concrete check to perform at VERIFY time. `mockup.html` section
7 asserted the suite would "walk every row of the state matrix" including 4a/12a, but their
presence/text/`aria-describedby` are by definition identical to rows 4/12, so a jsdom snapshot
assertion of those same properties proves nothing about whether the repeat is actually announced —
jsdom does not implement live-region announcement. Flagged this round (UX-STATE) as the same class
of gap VH-07 was raised to close for the colour-only signal: a promise with no record to check it
against.

**Decision.** Rows 4a and 12a are human-verified, not suite-asserted. `mockup.html` section 7 now
says this explicitly. The human check below is the record VERIFY is performed against.

**Human check to perform at VERIFY.** With a screen reader running: (a) submit a valid name twice
in a row with the same value (row 4a) and confirm the second "Hello, &lt;name&gt;" is announced,
not silent; (b) submit a blank/whitespace name twice in a row (row 12a) and confirm the alert is
announced again on the second failing submit, not silent; (c) confirm neither check above caused
the *other* region (status on a failing submit, alert on a successful one) to be announced or
touched — the scoping rule in `mockup.html` section 5 (row 4a force-mutates only the status
region; row 12a force-mutates only the alert).

**Rationale.** Same as VH-07: an unbacked promise of "the suite covers this" is worse than an
explicit, narrow human check, because it reads as covered when it silently is not. The mechanism
that makes (a)/(b) true (a keyed re-render, a visually-hidden counter, etc.) is still the
developer/frontend-design node's choice, per VH-09 — this record only names what a human confirms,
not how the developer gets there.

**Risk if wrong.** Low. If the mechanism is missing, the failure is cosmetic (a silent repeat
click) and caught at VERIFY, not a functional regression — every other scenario in this slice
still passes either way.

**What would change my mind.** A human deciding rows 4a/12a do not need to be perceivable at all
(then this check and VH-09's requirement both drop together), or the seam gaining a way to
observe live-region announcement (then this becomes a suite assertion instead of a human check).

---

## Index — arbiter round (DECIDE MODE, after round 5) — `architect` node

Four checker defects were still open when the `architect` node's rounds were spent. The node decided
each one, finalized `design.md` and the ADRs, and recorded the calls below. The `score` column is
`n/a`: the arbiter round is not scored, and the round-5 numeric score was not passed to this node.

| id | node | round | score | severity | decision | status |
| --- | --- | --- | --- | --- | --- | --- |
| VH-11 | architect | 5 (arbiter) | n/a | high | VH-09 is **adopted** into the design and owned by the aggregate: two monotonic counters on `Visit`, rendered as one keyed child node per region | open |
| VH-12 | architect | 5 (arbiter) | n/a | medium | R7's "no name" half gets its own owner, INV-6c (`useState<string>('')` inside `GreetingScreen`); "one mutable thing" is corrected to "in the domain" | open |
| VH-13 | architect | 5 (arbiter) | n/a | medium | ADR-0009 written with seven options; the architect node — not the developer node — takes the mechanism decision, before code exists | open |
| VH-14 | architect | 5 (arbiter) | n/a | low | `mockup.html` §7's keyboard-only directive is **adopted** for the two primary paths, with the v14 mechanics verified | open |

---

## VH-11 — VH-09 is adopted, and the aggregate owns it: two counters, two keyed child nodes

**Issue.** VH-09 (recorded by the `ux` node) requires that every submit be perceivable to a
screen-reader visitor, including a resubmission whose outcome is byte-identical to what is already
on screen (`mockup.html` state matrix rows 4a/12a) — scoped per result: a successful resubmit
renews the status region only, a failing resubmit renews the alert only, and neither region is ever
removed, recreated or left textless once it holds content. The design never read that record. Worse,
it asserted the opposite as a virtue: *"there is no async work … and therefore no idempotency, retry,
or ordering concern to design for. Repeat submissions are naturally idempotent for the same input."*
The checker built `src/visit.ts` and `src/GreetingScreen.tsx` exactly to the design and measured
**0 DOM mutations** on an identical resubmit, for both regions — the exact silence VH-09 exists to
prevent. The root cause is a modelling gap, not a rendering oversight: with `greetedName` and
`lastSubmissionWasBlank` only, `submit(submit(v,'Ada'),'Ada')` equals `submit(v,'Ada')`, so the
aggregate cannot distinguish a second identical submit from no submit at all.

**Options considered.**
1. **Refuse it in writing** and name the `developer`/frontend-design node as owner — legitimate on
   the checker's own terms ("if the architect's position is that VH-09 belongs to the developer
   node, say that explicitly and name that node as the owner").
2. **Adopt it, owned by the domain**: `greetingCount` incremented by `submit`'s non-blank branch and
   `blankCount` by its blank branch, each rendered as the React `key` of one child node inside its
   region.
3. **Adopt it, owned by the component**: two `useState<number>` nonces in `GreetingScreen`, bumped
   in the submit handler according to the outcome.
4. **A visually-hidden counter rendered as text** inside each region.
5. **Remove and re-insert the region/alert element** on each submit.
6. **A single `submissionCount`** used as the key for both regions.
7. **An imperative `useEffect`** that rewrites the text node on each submission.

**Decision.** **Option 2.** `design.md` now carries the requirement as **R9**, owned by **INV-8a**
and **INV-8b** (`submit` in `src/visit.ts`) with **P4/P5** (`GreetingScreen`); §3's "no idempotency
concern" paragraph is replaced by a correct one that names value-idempotence as the hazard; §5.4 is
a new section stating what is measured, what is mechanical and what stays human; and the full
options/consequences are in **ADR-0009**. Measured on a real build of both shapes: 0 mutations
without the counters, 2 with them on the region that changed, and **0 on the region that did not** —
which is the scoping rule (row 9 / Story2-S4) holding by construction rather than by care.

**Rationale.** Option 1 is the honest-sounding option and it is the one that ships the measured
silence: VH-09 left the *mechanism* open, not the *outcome*, and a requirement with no invariant, no
owner and no slice is a requirement that disappears between nodes. The design refuses exactly this
trade elsewhere (§5.1 declines to ship a lingering alert for one slice to buy a red bar); taking it
here would be incoherent. Option 3 was the closest call — it keeps the aggregate at two fields and
is unarguably a presentation mechanism for a presentation problem — but it duplicates in the
transport layer the very branch `submit` already owns, in a component that deliberately never
inspects outcomes (INV-5b), and nothing can test it: no unit reaches it, and jsdom cannot observe
announcement. Option 2 makes the same rule a pure-function property with two assertions in the
inner-cycle file that already exists. Options 4-7 each break something already agreed: a text nonce
breaks VH-04's textless region and Story 1's exact text; remove-and-reinsert is forbidden by VH-04
and VH-09 both; one counter would force-mutate the status region on a *failing* submit, re-announcing
a stale greeting (Story2-S4); an effect introduces the feature's first effect and first direct DOM
write for something `key` gives free.

**Risk if wrong.** Low-to-moderate, and it is a *modelling* risk rather than a behaviour risk. The
aggregate now carries two fields whose only consumer is a render key — real pressure from a
presentation need onto the domain model, and the strongest argument for option 3. If a human (or the
`developer` node) prefers the component to own it, move the two counters into `useState` and rewrite
P4/P5 against them: one commit, no scenario changes. If a human withdraws VH-09 entirely, delete the
two fields, the two keys and the two unit assertions; `Visit` returns to two fields and nothing else
in the design moves. In both directions the sixteen acceptance scenarios are untouched — none of
them can see the mechanism, which is precisely why this needed deciding rather than testing.

**What would change my mind.** A human saying "a silent repeat submit is fine" (then VH-09, R9,
INV-8a/8b, P4/P5 and ADR-0009 all drop together), or "the announcement mechanism is the developer's
call, not the design's" (then §5.4 keeps the measurement and the requirement, and the ADR's decision
paragraph becomes a recommendation). A screen-reader check showing that keyed node replacement does
**not** produce an announcement would change the *mechanism* rather than the decision — the
requirement would stand and ADR-0009 would be reopened with option 4 or 5 back on the table.

**Unresolved defect, verbatim.**

> **criterion** AR-BOUND · **severity** high
> **location** `.sdlc2/features/greet-visitor/design.md:4 (input scope) and :205-206 (§3, data flow)`
> **evidence** design.md:4 — "`VERIFY-WITH-HUMAN.md` (VH-01..VH-08 — decisions taken under caveat; honoured here, not relitigated)"; design.md:205-206 — "There is no async work, no effect, no cleanup, and therefore no idempotency, retry, or ordering concern to design for. Repeat submissions are naturally idempotent for the same input: `submit` is a pure function of `(visit, rawName)`." This is asserted as a virtue, but VERIFY-WITH-HUMAN.md:401 records a ninth decision the design never reads: "VH-09 — Repeat-identical-outcome resubmits (state matrix rows 4a, 12a) must be perceivable — outcome only, mechanism left open", whose Decision (VERIFY-WITH-HUMAN.md:429) is "Option 3, this round. `mockup.html` state matrix rows 4a and 12a, and section 5, now state the outcome and its per-result scope only", i.e. "every submit must be perceivable to a screen-reader visitor, without the status region/alert ever being removed, recreated, or left textless once it holds content". I built `src/visit.ts` and `src/GreetingScreen.tsx` exactly to design.md §4.1 and §2.4 P1/P2/P3 in a scratch copy of this repo and observed the status region and the alert with a MutationObserver across a repeat-identical submit: `MUTATIONS ON IDENTICAL RESUBMIT (status region): 0` and `MUTATIONS ON IDENTICAL FAILING RESUBMIT (alert): 0`. The exact failure VH-09 exists to prevent is produced by building this design as written. Nothing in §2.4's invariant table, §4.1's module surface, §5's seam table or the eight ADRs owns it: the `Visit` type has only `greetedName` and `lastSubmissionWasBlank`, so no purely domain-driven implementation can distinguish a second identical submit from no submit at all.
> **fix** Carry VH-09 into the design or explicitly refuse it in writing — do not leave it unread. Concretely: (a) delete or qualify the "no idempotency concern to design for" sentence in §3, since value-idempotence of `submit` is precisely what makes the live region silent; (b) add an invariant to §2.4 with exactly one owner, e.g. INV-8 "every submission is perceivable: a successful submit force-mutates the status region only, a failing submit force-mutates the alert only, and neither is ever removed, recreated or left textless once it holds content (mockup rows 4a/12a/9)" — the natural owner is either `Visit` (add a monotonic `submissionCount: number` written by `submit`, keeping the aggregate the single owner and keeping the component free of rules) or `GreetingScreen` (a keyed re-render), and the design must pick one and say so; (c) name the seam and the slice that drives it in §5 — rows 4a/12a are not acceptance criteria, so if it is to remain untested that must be stated as an accepted residual risk alongside VH-07's, not omitted; (d) record the choice as ADR-0009 with the rejected options. If the architect's position is that VH-09 belongs to the developer/frontend-design node, say that explicitly in §1 or §6 and name that node as the owner — an unread VH record is not a decision.

---

## VH-12 — R7's "no name" half gets its own owner: INV-6c

**Issue.** R7 is *"nothing survives a fresh visit: no name, no greeting, no alert"* — three things —
but the only invariant claiming it, INV-6a, covered the visit aggregate, which holds two of them.
The "Name field is empty after a fresh mount" half (a literal Story 4 acceptance step, driven at
slice 04) had no named owner: INV-7 owns only what the field's value *is*, not how long it lives. A
module-level `let rawName`, a hoisted `defaultValue`, or an uncontrolled input satisfies INV-6a and
INV-7 as written and still fails Story 4 — and §5.1's slice-04 remediation ("the visit was lifted to
a module-level `let` … move it back into `useState`") pointed a developer at the wrong state.
§2.3 also over-claimed: *"there is exactly one mutable thing in the design"*, while §3's own diagram
shows two `useState` hooks.

**Options considered.**
1. Extend INV-6a to name both hooks in one invariant.
2. Add a separate invariant, **INV-6c**, for the draft name's lifetime, owned by `GreetingScreen`.
3. Leave it, on the grounds that `useState` is the obvious implementation anyway.

**Decision.** **Option 2.** `design.md` §2.4 gains **INV-6c** ("the draft name has the same lifetime
as the visit — one `useState<string>('')` inside the component body; it may not be hoisted to a
module-level `let`, a context, a ref, web storage, or a `defaultValue`"); INV-6a is narrowed to say
it covers the greeting and alert halves of R7; INV-7 gains a clause saying lifetime is INV-6c's job;
§5.2 gains an explicit R7 traceability paragraph and lists INV-6c in the slice-01 and slice-04 rows;
§5.1's slice-04 remediation now tells the developer to read *which step* went red, because the two
scenarios cover two different hooks; §2.3's claim is corrected to "exactly one mutable thing **in the
domain**" with a note explaining why the draft is deliberately outside the aggregate; and ADR-0004
gains the same paragraph.

**Rationale.** Option 1 keeps the count of invariants down but merges two things a developer can
break independently — and the design's own stated rule is that a rule with two natural owners is
split so each half has one (INV-5a/INV-5b, INV-6a/INV-6b). Option 3 is what produced the defect.
The correction to §2.3 matters as much as the new invariant: "one mutable thing" was true of the
domain and false of the screen, and a claim that is false at a glance costs the reader trust in the
claims they cannot check.

**Risk if wrong.** Very low. This adds no behaviour and no code — it names an owner for a rule the
scenarios already test, and corrects two sentences. The only cost is one more row in the invariant
table.

**What would change my mind.** A reviewer preferring one merged invariant for both hooks (option 1)
— a presentational preference; the content is identical either way, and I would take that edit
without argument.

**Unresolved defect, verbatim.**

> **criterion** AR-BOUND · **severity** medium
> **location** `.sdlc2/features/greet-visitor/design.md:100-101 (§2.3), :129 (INV-6a), :173-174 (§3 diagram), :24 (R7)`
> **evidence** §2.3 claims "That is a structural property, not a promise: there is exactly one mutable thing in the design, and it is replaced wholesale by one pure function in one React state update per submission (ADR-0001)." But the §3 diagram shows two: "useState rawName : string        (INV-7)" and "useState visit   : Visit         (INV-6a)". R7 (design.md:24) is "Nothing survives a fresh visit (fresh mount): no name, no greeting, no alert" — three things — yet the only invariant claiming R7, INV-6a, covers one of them: "A visit's lifetime is exactly one mount of `GreetingScreen`: it begins at `newVisit` and ends when the component unmounts (R7). | `GreetingScreen` | One `useState<Visit>(newVisit)`; no ref, no context, no module import that could hold it." The "no name" half — the Name field being empty after a fresh mount, a literal Story 4 acceptance step driven at slice 04 — has no named owner in §2.4, and INV-7 owns only "the field's value is whatever the visitor typed", not its reset. The consequence is concrete in §5.1: "Slice 04 red ⇒ the visit was lifted to a module-level `let`, a context provider above the screen, or web storage. Fix: move it back into `useState` inside `GreetingScreen`." A developer whose slice-04 red bar is the `Then the Name field is empty` step is pointed at the wrong state, because `rawName` is not "the visit". A module-level `let rawName` or an uncontrolled input with a hoisted default satisfies INV-6a and INV-7 as written and still fails Story 4.
> **fix** Either extend INV-6a to name both hooks ("a visit's lifetime is exactly one mount: both `useState<Visit>(newVisit)` and `useState<string>('')` for `rawName` live inside `GreetingScreen`; neither may be hoisted"), or add INV-6c owned by `GreetingScreen` for the draft name's lifetime and map R7's "no name" half to it in §5.2's live-from table. Then correct §2.3's "exactly one mutable thing in the design" to "exactly one mutable thing in the *domain*" (which is what ADR-0001 actually supports), and widen §5.1's slice-04 remediation to name `rawName` alongside the visit.

---

## VH-13 — ADR-0009 is written, and the architect node takes the mechanism decision

**Issue.** N1 reduced the whole of the seed's "announced" to the status region's presence at first
render, and the §6 ADR index — the design's own list of decisions significant enough to record — had
no row for whether a live region must *re-announce*, even though §3 took a position on it. The one
decision in the feature with a recorded VH entry against it was the one decision taken with no
options, no consequences and no rejected alternatives. There is a boundary question underneath:
VH-09 left the mechanism to "the developer/frontend-design node", so writing an ADR here is the
architect node choosing to spend that latitude before any code exists.

**Options considered.**
1. Write the ADR and pick the mechanism (spending VH-09's latitude now).
2. Write no ADR; note in §6 that the mechanism is the developer node's to pick, and leave the design
   silent on it.
3. Write an ADR that lists the options but declines to choose, deferring to the developer node.

**Decision.** **Option 1.** `docs/adr/0009-making-every-submit-perceivable.md` records the context
(including the measured 0-mutation result), seven options with reasons each lost, the decision, the
boundaries it respects, the slice sequencing under ADR-0007, and the consequences — including the
two costs accepted. §6's index gains its row, N1 is rewritten as two conditions with (b) pointing at
INV-8a/8b, P4/P5 and ADR-0009, and ADR-0001/0004/0005/0007 carry short amendment notes so no earlier
ADR now reads as contradicted-but-unmarked.

**Rationale.** The architect node is the node that hands down to `developer`; "left to the developer
node" is satisfied by a design that names the mechanism and stays cheap to reverse, and is *not*
satisfied by silence. A decision that changes the aggregate's shape is by this design's own standard
significant enough to record, and recording it is what makes it arguable later — the ADR names the
option a reasonable reviewer would prefer (component-local nonces) and says exactly what would make
it the better call.

**Risk if wrong.** Low. If the `developer` node or a human disagrees with the mechanism, ADR-0009 is
superseded by a follow-up ADR — the normal path — and the rewrite is confined to two fields, two
keys and two unit assertions. The specific risk of option 1 over option 3 is that a downstream node
treats a Proposed ADR as settled and stops thinking; the ADR's Status line and its "Negative /
accepted" section are written to prevent exactly that.

**What would change my mind.** A human saying the architect node should not pre-empt frontend-design
choices at this granularity — in which case ADR-0009's Decision section becomes a recommendation and
INV-8a/8b/P4/P5 relax to "some mechanism satisfying R9", with §5.4's measurement kept as evidence
that the naive shape does not satisfy it.

**Unresolved defect, verbatim.**

> **criterion** AR-ADR · **severity** medium
> **location** `.sdlc2/features/greet-visitor/design.md:31 (N1) and :544-553 (§6 ADR index)`
> **evidence** N1 is stated as "The greeting must be **announced**: `role="status"` region present from first render, never created-on-demand. | Presentation invariant P1 below (VH-04)." — the whole of "announced" is reduced to the region's presence at first render. The §6 index enumerates every decision judged significant enough to record: ADR-0001 aggregate, 0002 derived greeting, 0003 pure module, 0004 component-local state, 0005 seam, 0006 no ports, 0007 invariants arrive whole, 0008 purity guard. There is no row for when (or whether) a live region must re-announce, even though §3 takes a position on it ("Repeat submissions are naturally idempotent for the same input") that determines whether the seed's "announced to the visitor" holds on the second click. A decision that changes the aggregate's shape (a submission counter) or the component's render strategy (a keyed remount) and that has a recorded VH entry against it is by the design's own standard "significant enough to record", and it is the one decision in the feature taken with no options considered, no consequences and no rejected alternatives.
> **fix** Add ADR-0009 ("Making every submit perceivable in the live regions") with at minimum: option 1 leave it unconstrained (VH-09 option 1, and say why that is or is not acceptable); option 2 a `submissionCount` field on `Visit` written by `submit` and rendered into the status region as a keyed value; option 3 a component-level `key` on the status/alert element; option 4 a visually-hidden nonce; the chosen option, its consequences for INV-3/INV-5b and P1/P2, and why the others lost. Add the row to design.md §6's table and cite it from N1, so "announced" is backed by more than the region's presence at first render.

---

## VH-14 — The keyboard-only primary path is adopted, not silently declined

**Issue.** §5's "Seam mechanics the developer should not have to rediscover" reads as exhaustive and
prescribed only a pointer-driven interaction (`user.click` before `user.paste`), while `mockup.html`
§7 directs that the full happy path and the full recovery path be completable using only
`user-event`'s keyboard interactions, never a pointer-only or `fireEvent`-only shortcut for the
primary path. No acceptance criterion requires keyboard operability either way, so the design was
free to decline — but declining a named ux directive by omission is drift, and a developer reading
§5 as authoritative would have written a pointer-only primary path.

**Options considered.**
1. Adopt the directive and write the mechanics into §5.
2. Decline it in one line, with the reason and a pointer to `mockup.html` §7.
3. Leave §5 silent (the status quo the checker rejected).

**Decision.** **Option 1.** §5 gains a bullet putting the walking-skeleton scenario (slice 01) and
the recovery scenario (slice 03) on a keyboard-only path — `await user.tab()` → `user.keyboard('Ada')`
→ `user.tab()` → `user.keyboard('{Enter}')` — and the tab-paste step now prefers `user.tab()` over
`user.click()`, so no pointer is needed anywhere. ADR-0005 records the same. Every mechanic was
verified against the installed `user-event` 14.6.4 rather than asserted: `{Enter}` activates a
focused native `<button type="button">` with or without a surrounding `<form>` (so this is
compatible with either VH-01 shape); `Ada{Enter}` typed in the *field* submits only in the `<form>`
shape, so it must not be used in a shared scenario; `user.tab({ shift: true })` walks back;
Space is a literal `' '` in v14, and **`'{Space}'` is not a key descriptor — it throws nothing,
activates nothing, and would leave a scenario asserting against an unsubmitted screen.**

**Rationale.** The cost is zero (the same number of lines, no new dependency, no scenario change) and
the benefit is real: the primary paths are the ones a keyboard-only visitor must be able to complete,
and a suite that only ever clicks cannot notice if that stops being true. Declining (option 2) would
have been defensible — no AC requires it — but there is no reason to buy the weaker option when the
stronger one is free.

**Risk if wrong.** Very low. If a keyboard-only step proves flaky in this stack, the fallback is
`user.click` on the submit control, which every scenario tolerates; nothing in the design or the
acceptance criteria depends on the interaction style. The verified `{Space}` trap is the one thing
that could bite silently, which is why it is written down rather than left to be rediscovered.

**What would change my mind.** A human or the `developer` node finding that the keyboard path
interacts badly with the `<form>` choice left open by VH-01 — in which case pin the VH-01 shape
first, then rewrite this bullet against it.

**Unresolved defect, verbatim.**

> **criterion** AR-SEAM · **severity** low
> **location** `.sdlc2/features/greet-visitor/design.md:344-369 (§5, "Seam mechanics the developer should not have to rediscover")`
> **evidence** The seam mechanics list is presented as exhaustive — "Seam mechanics the developer should not have to rediscover" — and the only interaction it prescribes is pointer-driven: "```ts\n  const nameField = screen.getByLabelText('Name')\n  await user.click(nameField)      // paste() targets the FOCUSED element in user-event v14\n  await user.paste('\\tAda\\t')      // slice 01; slice 02's tab-only case pastes '\\t'\n  ```", closing with "Every test uses `userEvent.setup()` and `await`s each interaction — the existing `AppBanner.test.tsx` style ... is the house style to match." It is silent on keyboard operability, while `mockup.html` section 7 states the suite "should prove the full happy path plus the full recovery path are completable using only `@testing-library/user-event`'s keyboard interactions under jsdom (`Tab`, `type`, `Tab`, `{Enter}`/`{Space}` on the button) — never a pointer-only or `fireEvent`-only shortcut for the primary path." No acceptance criterion in feature.md requires this either way, so the design is free to decline it — but declining a named ux directive silently is drift, and the developer node reading §5 as authoritative will write a pointer-only primary path.
> **fix** Add one bullet to §5's seam mechanics either adopting the directive ("the walking-skeleton scenario and the recovery scenario are driven keyboard-only: `await user.tab()` to the field, `await user.keyboard('Ada')`, `await user.tab()`, `await user.keyboard('{Enter}')` — a native button activates on Enter with or without a `<form>`, so this is compatible with VH-01 either way; `user.click` is used only for the tab-paste focus step, which is not a primary path") or declining it in one line with the reason and a pointer to mockup.html section 7, so the divergence is a decision rather than an omission.
