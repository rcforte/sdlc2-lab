# ADR-0040 — The row's accessible name carries the stable absolute time, and the age reading is `aria-hidden`

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `saved-at` (`.sdlc2/features/saved-at/design.md` §2.4 P21/P22, §5.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0022 (the Saved names region is a named live section), ADR-0029 (rows are keyed
  by name), ADR-0030 (every list write is perceivable), ADR-0037 (where `14:20` is formatted)

## Context

The seed pairs a promise and its compensation in one bullet: *"The passage of time is never
announced. The age reading is hidden from assistive technology, and each row exposes a stable
absolute time in its place."* Issue 01 turns that into two criteria a test must be able to make:

```gherkin
Then the row for "Ada" has an accessible name that includes a stable absolute time
And  the row for "Ada" has an accessible name that does not include the words "ago" or "just now"
```

The product brief leaves the technique open on purpose (*Out of scope*: "the exact accessibility
technique used to hide the age reading… left to architecture/ux"), and the mockup draws the stable
time as visible muted text with a note saying it stands in for something the real app hides.

Two facts constrain the answer, and one of them is easy to get wrong:

- Rows live **inside** the polite `aria-live` Saved names region. Text that changes inside a live
  region is announced — so an age reading that ticks would announce the passage of time roughly four
  times a minute, per row.
- A `listitem` **takes no accessible name from its contents**. Measured in this repo: with no
  authored name, `computeAccessibleName(<li>)` is the empty string, so the criterion above is
  unreachable by any markup that only adds *content* to the row.

## Options considered

1. **A visually-hidden `<span>` carrying `saved at 14:20`, with no attribute on the row** (the
   mockup's own drawing, read literally).
   *Rejected.* It puts the time in the accessibility tree but gives the row **no accessible name at
   all**, so issue 01's criterion cannot be asserted — `toHaveAccessibleName` sees `''`. Measured, not
   reasoned: this is the option the mockup suggests and the seam refutes.

2. **`aria-describedby` on the row pointing at that hidden span.**
   *Rejected.* A description is not a name, so the criterion still fails; and descriptions on
   non-interactive elements are announced inconsistently across screen readers.

3. **`title` on the row.**
   *Rejected.* `title` is a last-resort naming source, is unreachable by keyboard and touch, and would
   also render a mouse tooltip nobody asked for.

4. **`aria-labelledby` pointing at the name span and a hidden time span.**
   *Rejected, though it is the closest rival.* It produces the same accessible name as the chosen
   option while adding two generated ids per row (five rows, ten ids, all of which must stay unique
   across appends and re-sorts) and leaving the time span in the tree to be read a second time when
   the visitor steps into the row.

5. **`aria-label` on the `<li>`, plus `aria-hidden="true"` on the age reading span.** *(chosen)*

## Decision

```jsx
<li key={saved.name} aria-label={`${saved.name}, saved at ${clockTimeText(saved.savedAt)}`}>
  <span>{saved.name}</span>
  <span aria-hidden="true">{ageReadingText(saved.savedAt, now)}</span>
  {isNewest && <span>Newest</span>}
  … the two row controls …
</li>
```

The two attributes are **one mechanism with two halves**, and neither works alone:

- `aria-hidden` on the age reading takes the ticking text out of the accessibility tree, so a tick
  mutates nothing a live region can announce. It is the *only* node in the region whose text changes
  on a tick, so this one attribute is the whole of "the passage of time is never announced".
- `aria-label` on the row puts an **unchanging** string where assistive technology looks for the row's
  name. It is computed from two immutable fields, so it changes only when the row's name or its moment
  changes — that is, never, for the life of the row.

The label is the name and the time only. The **`Newest` marker is deliberately not in it**: it stays
ordinary text in the row so a screen-reader visitor perceives it the same way a sighted one does (the
po's "one rule, either view"), and so the marker moving does not rewrite a name the seed promised
would stay stable.

Measured through the declared seam (design.md §5.4): `toHaveAccessibleName('Ada, saved at 14:20')`
passes, the name is unchanged after five simulated minutes, `queryAllByRole('listitem')` still finds
labelled rows, and the `aria-hidden` age text is still reachable by `getByText` — so the sighted
visitor's reading is assertable **and** invisible to the accessibility tree at the same time.

## Consequences

**Positive**

- Both of issue 01's assistive-technology criteria are directly assertable, with no test-only markup
  and no snapshot.
- A screen-reader visitor hears a row whose identity never shifts under them, while a sighted visitor
  watches the reading count up — the seed's exact split, from two attributes.
- No visually-hidden CSS utility class enters this repo, which has none today.

**Negative / accepted**

- **The row's name duplicates text already inside it.** A visitor may hear `Ada, saved at 14:20` and
  then, stepping in, `Ada` again. The alternative (naming the row *only* by the time) would be worse:
  a row that announces a time and not whose name it is.
- **`aria-label` on a non-interactive element depends on the screen reader honouring it**, and jsdom
  cannot tell us whether it does, or whether the label suppresses anything in browse mode. This is the
  one place the design leans on AT behaviour it cannot test: **VH-02**, continuing the open
  screen-reader passes from `saved-name` and `remembered-names`.
- **It departs from the mockup's markup** (a visible-in-mockup `.row-time` span) while producing the
  outcome the mockup describes. The mockup says the technique is illustrative and the product brief
  leaves it to architecture, so this is a deviation from a drawing, not from a decision. The row's
  wording — `<name>, saved at HH:MM` — is nobody's agreed copy yet: **VH-01**.
- **The age reading is invisible to `getByRole` queries**, so scenarios must reach it by text
  (`within(row).getByText(...)` or `toHaveTextContent`). Stated in design.md §5.4 so the developer does
  not read a failing role query as a broken implementation.

## Related

ADR-0022, ADR-0029, ADR-0030, ADR-0037, `.sdlc2/features/saved-at/mockup.html` (story 01's row),
`.sdlc2/features/saved-at/feature.md` (*Agreed scope*, *Out of scope*).
