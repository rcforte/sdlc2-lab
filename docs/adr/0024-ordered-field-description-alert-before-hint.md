# ADR-0024 — The Name field's description is one ordered `aria-describedby` list: alert first, hint second

- **Status:** **Accepted** (2026-08-23, at the human VERIFY gate). The code exists and is merged
  to `main`; the suite is green at 61 tests.
- **Date:** 2026-08-22
- **Feature:** `saved-name` (`.sdlc2/features/saved-name/design.md` §2.4 P9/P10, §4.3, §5.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Supersedes:** presentation invariant **P3** of `greet-visitor` (design §2.4 there), which said
  the field's `aria-describedby` references *the alert* iff the alert is present. P10 generalises it
  to an ordered list; P3's behaviour is the one-member case and is unchanged in effect.
- **Relates to:** ADR-0022 (the region shows the same string in the other place), VH-01

## Context

Two independent things can describe the Name field:

- the **blank-name alert** (`greet-visitor`, already merged, `id="name-error"`), present iff the most
  recent submission was blank;
- the **saved-name hint** (this feature), present iff a name is saved.

The seed fixes the order when both are present: *"the field is described by **both**, and the
**alert comes first**: the error about the submission just made outranks standing context."* Story 3
asserts it as one observation:
`toHaveAccessibleDescription('Please enter your name. Saved: Ada')`.

Two constraints bound the solution, and both are load-bearing:

- The seed requires the hint to be **visible text** *and* programmatically associated. A
  visually-hidden node would satisfy `toHaveAccessibleDescription` while showing a sighted visitor
  nothing at the field — which is why issue 03 adds *"the element the Name field is described by is
  visible"*.
- The merged suite asserts `toHaveAttribute('aria-describedby', alert.id)` **exactly** (twice) and
  `not.toHaveAttribute('aria-describedby')` **twice**. Any implementation that pads the attribute
  with a placeholder id, or empties it instead of removing it, turns merged tests red.

## Options considered

1. **`aria-describedby` on the alert path only, plus `aria-label`/`title` for the hint.**
   *Rejected.* `aria-label` **replaces** the accessible *name*, not the description, so it would
   overwrite the field's label "Name" — breaking `getByLabelText('Name')` across the entire merged
   suite. `title` is a tooltip: invisible until hover, unavailable to keyboard-only visitors, and it
   is not what "visible text" means.

2. **A placeholder** (`placeholder="Saved: Ada"`).
   *Rejected — and the seed rejects it by name.* A placeholder vanishes on the first keystroke,
   reads as a value that is not there, and fights the field's own content. Story 3's
   *"the hint stays present while the visitor is mid-draft"* would fail outright.

3. **One merged description node** — a single element whose text is built from both messages.
   *Rejected.* It gives the alert two owners: the alert element (`role="alert"`, its own live
   region, keyed by `blankCount` — P2/P5) and this new node. The alert would either announce twice
   or stop being an alert, and `greet-visitor`'s `queryByRole('alert')` assertions would need
   rewriting.

4. **Hint first, alert second** (chronological: the standing context, then the new error).
   *Rejected.* It contradicts the seed's stated decision, and the reason is good: a visitor who just
   submitted blank needs the error before the trivia. It would also quietly change what
   `greet-visitor`'s alert *sounds* like, which no scenario in that feature asked for.

5. **Two elements, one computed ordered `aria-describedby` list, attribute removed when empty.**
   *(chosen)*

## Decision

**P10 (supersedes P3).** One expression, computed once per render:

```tsx
const savedNameHint = savedNameText(visit)          // INV-15 — null when nothing is saved
const describedBy = [
  alert !== null ? ALERT_ID : null,                 // the error about what just happened, first
  savedNameHint !== null ? SAVED_NAME_HINT_ID : null,
]
  .filter((id) => id !== null)
  .join(' ')

<input … aria-describedby={describedBy === '' ? undefined : describedBy} />
```

with **P9**: the hint is a **visible** `<p id={SAVED_NAME_HINT_ID}>` beside the field, rendered iff
`savedNameHint !== null`. P2, P9 and P10 read the same two expressions, so an element can never be
present without its id in the list, or vice versa.

`undefined` — not `''` — when the list is empty: an empty `aria-describedby` is still a dangling
reference, and the merged suite asserts the attribute is **absent**.

Verified on the installed toolchain (design §5.4): with
`aria-describedby="name-error saved-name-hint"`, the accessible description is
`"Please enter your name. Saved: Ada"` — the id order **is** the read order, parts joined by a single
space, and the alert's keyed `<span>` child does not disturb it.

## Consequences

**Positive**

- Story 3's ordering scenario is satisfied by the order of a two-element array literal — the rule is
  the code, not a comment.
- The merged suite stays green with no edits: nothing-saved ⇒ the list has at most one member, so
  the attribute is exactly `alert.id` or absent (design §4.3).
- The hint text has one source (`savedNameText`, INV-15), shared with the region, so VH-01's "one
  phrase, reused" is structural — and one edit changes both if a human prefers different copy.
- Adding a third describer later is one array entry at one known position.

**Negative / accepted**

- **P3 is superseded**, so `greet-visitor`'s design now has one presentation invariant that points
  elsewhere. Accepted, and recorded in both directions (this ADR's *Supersedes*, and design §2.4/§5.2)
  rather than left for a reader to discover.
- **The description order is asserted, but its usefulness is not.** Whether a screen reader's
  rendering of "error, then context" actually helps is a human judgement — VH-02(e) covers reading
  the hint at all; the ordering itself is the seed's decision and is not re-opened here.
- Asserting the described element's *visibility* requires resolving ids from the attribute
  (design §5.4 gives the three-line mechanic), which reaches slightly past pure role/name querying.
  Accepted: it is still the rendered DOM, and it is the only way to catch a visually-hidden hint —
  precisely the gap `toHaveAccessibleDescription` cannot see.

## Related

`greet-visitor` design §2.4 P2/P3/P5, ADR-0022, VH-01, this design §2.4 P9/P10, §4.3, §5.4.
