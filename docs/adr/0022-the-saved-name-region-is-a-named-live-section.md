# ADR-0022 — The Saved name region is a named `<section>` with `aria-live="polite"`, and never `role="status"`

- **Status:** Proposed — accepted pending the human VERIFY gate. Additionally contingent on the
  still-open **VH-02** (the human screen-reader check this decision's risk hangs on).
- **Date:** 2026-08-22
- **Feature:** `saved-name` (`.sdlc2/features/saved-name/design.md` §2.4 P7, §4.2, §4.3, §5.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0023 (how it re-announces), `greet-visitor` VH-04 (why a live region must be
  present before its text arrives), VH-01/VH-02 of this feature

## Context

The region has to satisfy four things at once:

1. Be **queryable as one element with one role and the accessible name "Saved name"** — the product
   contract fixes `getByRole('region', { name: 'Saved name' })`.
2. Be **visibly headed "Saved name"** (seed, *Agreed scope*).
3. Be a **polite live region**, present from the first render (the VH-04 lesson: a live region
   created at the moment its text arrives is not reliably announced).
4. **Not break the merged suite.** `src/GreetingScreen.test.tsx` contains **17 bare
   `getByRole('status')` calls**. A second element with `role="status"` makes every one of them
   throw on "multiple elements" — turning a merged, human-verified suite red for a reason none of
   its own scenarios changed.

`feature.md`'s Contract vocabulary and `VERIFY-WITH-HUMAN.md` VH-02 have already decided (4) and are
not reopened here. What this ADR decides is the element and the naming mechanism, and it records the
trade so that VH-02's human check has something concrete to fail against.

## Options considered

1. **`role="status"` on the new region** (the strongest, best-supported live-region role).
   *Rejected, and it is the strongest rejected option.* It would give the most reliable
   announcement — but at the cost of 17 assertions in a merged, human-confirmed suite, whose only
   repair is to re-scope every one of them (`getByRole('status')` → a name-scoped query) inside a
   feature that changes none of those scenarios' behaviour. VH-02 already took this call; this ADR
   records the price, which is real: an attribute-only live region *may* be announced less reliably
   by some assistive technology, and VH-02(c) is the check that decides it.

2. **`<div aria-live="polite">` with no role.**
   *Rejected.* It is a valid live region, but it is not queryable as `role="region"`, so the
   contract's own vocabulary (`getByRole('region', { name: 'Saved name' })`) would have no element
   to resolve, and the region would be invisible to landmark navigation.

3. **`<section role="region" aria-label="Saved name">` plus a separate visible `<h3>`** (the
   mockup's literal shape).
   *Rejected on two counts.* (a) `aria-label` duplicates the accessible name: the visible heading
   and the programmatic name become two strings that must be kept equal by hand, and an
   `aria-label` silently wins over visible text if they drift — the classic "the screen reader says
   something the screen does not" defect. (b) The explicit `role="region"` is redundant on a named
   `<section>`. The mockup's `<h3>` is an artefact of the mockup page's own heading chrome (its
   `<h1>`/`<h2>` are page furniture); the real screen has one `<h1>` in `AppBanner` and no other
   heading, so `<h2>` is the correct level.

4. **Reuse `greet-visitor`'s status region** — put the saved name inside it.
   *Rejected.* Two facts with two lifetimes in one element: a save would re-announce the greeting
   and a greeting would re-announce the save, and the Story 1 assertion *"the Saved name region
   appears after the status region"* could not even be written.

5. **`<section aria-labelledby={id} aria-live="polite">` containing `<h2 id={id}>Saved name</h2>`.**
   *(chosen)*

## Decision

```tsx
<section aria-labelledby={SAVED_NAME_HEADING_ID} aria-live="polite">
  <h2 id={SAVED_NAME_HEADING_ID}>Saved name</h2>
  <p><span key={visit.saveCount}>{savedNameRegionText(visit)}</span></p>
  {/* controls — P6, P11, P12 */}
</section>
```

Rendered **unconditionally, from the first render**, positioned after the status region, and
outside the `<form>`. `role="region"` is the implicit role of a `<section>` **that has an accessible
name**; the name comes from the visible heading, so the heading the seed requires and the name the
tests query are the *same DOM node*. No `aria-label`, no explicit `role`, and no `role="status"`
ever.

Verified against the installed toolchain (design §5.4): `getByRole('region', { name: 'Saved name' })`
resolves this shape; `getAllByRole('status')` still returns exactly one element; and
`toHaveTextContent('No name saved yet.')` passes with the `<h2>` inside (substring match).

## Consequences

**Positive**

- One element answers the region query, the name query and the heading requirement — nothing to keep
  in sync.
- A useful failure mode: a `<section>` *without* an accessible name has **no** role at all, so if
  anyone deletes the `aria-labelledby`, the query fails loudly instead of degrading silently.
- The merged suite's 17 `getByRole('status')` calls and 3 `getByRole('heading', { name: 'sdlc2 lab' })`
  calls are untouched (the heading query is name-scoped).
- It matches the shape the concurrent `greeting-log` feature independently chose for its own region
  (`<section aria-labelledby><h2>`), so if both merge the screen is consistent and the two regions
  are told apart by name.

**Negative / accepted**

- **An attribute-only live region may be announced less reliably than `role="status"`.** This is the
  open risk, owned by VH-02(c). If a real screen reader is silent there, the reopened options are:
  strengthen the re-render key (ADR-0023), or take `role="status"` and pay for re-scoping the 17
  merged assertions. The design does not pretend the risk away.
- The `<h2>` is part of the region's `textContent`, so `toHaveTextContent` is a substring assertion
  and a `/^…$/` regex must not be used on the region (design §5.4 states the mechanic).
- A second live region now exists on the screen. VH-02(d) is the human check that a save does not
  cross-announce the greeting; the DOM-level half is measured (design §5.4: 0 status mutations on a
  save, 0 region mutations on a greeting).

## Related

ADR-0023, ADR-0024, `greet-visitor` VH-04/VH-09/VH-10 and ADR-0009, this feature's VH-01/VH-02,
design §2.4 P7/P8, §4.2, §4.3, §5.4.
