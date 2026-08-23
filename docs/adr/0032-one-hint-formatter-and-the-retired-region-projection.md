# ADR-0032 — One formatter owns the `Saved:` hint for the whole list; `savedNameRegionText` is retired rather than widened

- **Status:** Proposed — accepted pending the human VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `remembered-names` (`.sdlc2/features/remembered-names/design.md` §2.4 INV-25/P15/P20, §4.3)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Supersedes:** INV-15 (`savedNameText`) and **retires INV-16** (`savedNameRegionText`)
- **Relates to:** ADR-0024 (alert before hint — unamended), ADR-0003 (rules and copy in a pure
  module), `saved-name` VH-01 (the region's and the hint's copy, human-confirmed)

## Context

The single-slot feature had two projections over one string: `savedNameText` (`Saved: <name>`) fed
the hint, and `savedNameRegionText` (`savedNameText(visit) ?? 'No name saved yet.'`) fed the region,
so the two places the name appeared could not drift.

This feature breaks that symmetry. The hint is still one sentence — now naming every saved name in
list order — but the region is no longer text at all: it is a heading, an optional refusal, and
either an empty-state sentence or a list of rows carrying six controls between them. A projection
returning "the region's words" can no longer describe the region.

There is also a compatibility question that decides whether one slice is red or green: four merged
hint scenarios (`leaves the Name field undescribed…`, `describes the Name field with the saved
name…`, `keeps the hint… mid-draft`, `alert before the hint`) must keep passing in every lane.

## Options considered

1. **Widen `savedNameRegionText` to return the joined list** (`Saved: Ada, Bob` / the empty state)
   and render it as the region's text, with rows drawn separately.
   *Rejected.* The region would then say the names twice — once as a sentence, once as rows — and
   the seed's region copy is *rows plus an empty state*, not a recital. This is the "interface wider
   than the work it does" case: the projection would keep its shape and lose its meaning.
2. **Keep `savedNameRegionText` as a thin alias** for the empty-state constant.
   *Rejected.* Its whole body would be `return NOTHING_SAVED_MESSAGE` — the do-nothing wrapper
   ADR-0009 already refused once. The constant is exported; the component can read it.
3. **Let the component build the hint** by joining `visit.savedNames` itself.
   *Rejected.* It moves product copy and a separator into the driving adapter, gives the `Saved: `
   phrasing a second possible home, and makes `', '` a decision two future readers could each make
   differently. ADR-0003 puts messages in the pure module because they are rule output.
4. **Delete the hint at the slice that replaces the slot, and rebuild it at the hint's own slice**
   (which would make that slice red-first).
   *Rejected.* It buys a red bar with a visible regression to a merged, correct capability, and the
   four merged scenarios above would have to be deleted and then written again nearly verbatim.
   Buying red with a known regression is the trade this repo has refused repeatedly.
5. **One formatter, `savedNamesHintText`, whose one-name case is byte-identical to the old string;
   `savedNameRegionText` deleted; the empty state exported as a constant the component renders.**
   *(chosen)*

## Decision

```ts
export function savedNamesHintText(visit: Visit): string | null   // `Saved: ${savedNames.join(', ')}` | null
export const NOTHING_SAVED_MESSAGE = 'No names saved yet.'        // copy change: plural
// savedNameText and savedNameRegionText are deleted
```

- INV-25: this is the **only** place the `Saved: ` phrasing and the `, ` separator exist, so
  `saved-name` VH-01's confirmed copy still has exactly one edit site.
- The empty-state decision moves from a projection to **P15**, a presentation invariant: the region
  renders the empty-state `<p>` iff the list is empty, and the `<ul>` otherwise. That is an element
  shape question, which is the component's to own — and the component still never *types* the
  sentence, it reads the constant.
- ADR-0024 is untouched: `aria-describedby` is still the ordered list of present ids, alert first
  (P10), with `savedNamesHintText` substituted for `savedNameText`.

## Consequences

**Positive**

- The one-name case is the old string exactly, so four merged hint scenarios pass unchanged and the
  hint's own slice is a guard rather than a rebuild (design §5.1, §4.3).
- The hint cannot disagree with the rows, because both read `savedNames` — no invariant needed
  (design §2.4, closing note).
- One deletion, no dead code, no wrapper: the module's exported surface shrinks by one while its
  capability grows.

**Negative / accepted**

- **A widening list makes a widening description.** Five names produce
  `Saved: Ada, Bob, Cleo, Deb, Eve` in the field's accessible description, read on every focus. The
  bound of five exists precisely to keep it a sentence (seed), and whether it should be there
  mid-draft at all is the seed's own open question — carried to the human as part of **VH-04**.
- Deleting an exported function is a breaking change to `src/visit.test.ts`'s import list. Named in
  design §4.3 so a lane meets it as an instruction rather than as a surprise.
- The separator is English-specific (`, `, no Oxford "and"). Accepted: i18n is out of scope and the
  copy is the seed's, verbatim.

## Related

ADR-0003, ADR-0009, ADR-0024, `saved-name` VH-01, design §2.4, §2.5, §4.3, §5.1.
