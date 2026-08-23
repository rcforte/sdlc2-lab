# ADR-0023 — Every save is perceivable: the aggregate counts saves, the component renders that count as node identity

- **Status:** **Accepted structurally** (2026-08-23, at the human VERIFY gate) — the code is merged
  and the testable half is asserted. **The audible half is still open as VH-02** and needs a real
  screen reader. "Every save is perceivable" is therefore a claim this repo has verified for
  sighted visitors only.
- **Superseded in part by:** **ADR-0030**, which replaces this record's *mechanism* — a save
  counter plus a keyed child wrapping the region's whole text — with one that keys on a revision of
  the list. Only the mechanism is superseded. This record's **requirement** — *a save that appears
  to do nothing must not be silent* — is not: ADR-0030 keeps it and widens it to refusals and
  removals. The caveat in the Status line above travels with it, and is still open. A reader
  arriving here first should read ADR-0030 next.
- **Date:** 2026-08-22
- **Feature:** `saved-name` (`.sdlc2/features/saved-name/design.md` R15, §2.4 INV-11/P8, §5.4)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0009 (the same problem, solved the same way, for the status region and the
  alert), ADR-0019, ADR-0022

## Context

The seed requires: *"The saved-name region is a polite live region: saving announces the region's
new content. **Saving the same name a second time announces again rather than falling silent.**"*

That second sentence is the whole problem, and it is the same one ADR-0009 already met on this
screen: an ARIA live region is announced when its content **mutates**, not when a button is clicked.
If a visitor saves "Ada" while "Ada" is already saved, a naive implementation renders the identical
string, React writes nothing to the DOM, no mutation record is produced, and the visitor hears
nothing — with no other feedback available, because saving deliberately does not move focus and
changes nothing else on screen.

This is **measured, not theorised** (design §5.4, `MutationObserver` on a real build of both
shapes):

| shape | region mutations on an identical replace |
| --- | --- |
| `<span>{text}</span>` | **0** — silent |
| `<span key={saveCount}>{text}</span>` | **2** |

No acceptance scenario can see the difference: presence, text and attributes are byte-identical in
both. So if the design does not choose the mechanism, nothing will.

## Options considered

1. **Leave it to the developer** ("the mechanism is left open").
   *Rejected.* `feature.md` leaves the *mechanism* open, not the *outcome*, and an outcome with no
   invariant, no owner and no seam is how a requirement disappears. ADR-0009 refused this exact
   trade one feature ago; refusing it there and taking it here would be incoherent.

2. **Compare in the component and force a re-render** (`if (savedName === greetedName) …`), or key
   the child on `Date.now()` / `Math.random()`.
   *Rejected.* A time or random key re-mounts the node on **every** render, including renders caused
   by typing in the Name field — the region would re-announce while the visitor types, which is
   noise, not feedback. It also puts a non-deterministic value in the render path, and
   `Date`/`Math.random` are in the INV-6b guard's forbidden list precisely so the domain stays
   deterministic.

3. **Blank the region and refill it** (empty the text, then set it in an effect).
   *Rejected.* Two announcements for one save, a flash of missing text for a sighted visitor, and an
   effect where a pure render suffices. It also contradicts the shape ADR-0009 established: a live
   region is never emptied or recreated once it holds content.

4. **Move focus to the region instead of announcing** (the `greeting-log` feature's answer for its
   clear action).
   *Rejected — and the seed rejects it explicitly.* Focus moves are the right answer when the
   focused control is *destroyed* (which is why `greeting-log` uses one); the save control survives
   its own activation, so moving focus would take the visitor somewhere they did not ask to go, and
   Story 1's *"saving does not move focus"* forbids it outright.

5. **A monotonic `saveCount` on the aggregate, rendered by the component as the React `key` of the
   region's single text child.** *(chosen)*

## Decision

The domain states the fact — **INV-11: every save is a new save**, `saveCount` incremented by
`save`'s writing branch and changed nowhere else. The component renders that fact as identity and
nothing else — **P8**: `<p><span key={visit.saveCount}>{savedNameRegionText(visit)}</span></p>`,
inside a `<section>` that is never removed, recreated or left textless (P7).

Consequences for the developer, stated as prohibitions because each is a plausible "improvement"
that would silently break the requirement:

- **Do not short-circuit an identical save** (`if (visit.savedName === visit.greetedName) return visit`).
  `saveCount` would freeze and the region would fall silent — the exact defect. Story 4's third
  scenario is the guard for the visible half; the audible half is VH-02(c).
- **Do not increment `saveCount` in the no-op branch** (INV-10): a save that did nothing is not a
  save, and announcing one would be a lie.
- **`saveCount` is never displayed, never compared, never branched on, and gets no wrapper
  projection** — the same three prohibitions ADR-0009 placed on `greetingCount`/`blankCount`.

## Consequences

**Positive**

- The third live region on this screen works the same way as the first two: one counter per fact,
  one keyed child per region, all keys read from the aggregate and never computed in the component.
  A reader who has understood ADR-0009 already understands this.
- **Scoping is free.** `save` advances only `saveCount`, so a save re-keys only the Saved name
  region; `submit`/`greetAgain` advance only `greetingCount`, so a greeting re-keys only the status
  region. Measured in both directions (design §5.4: 0 cross-mutations either way), which is N7 —
  saving must not re-announce the greeting, and greeting again must not re-announce the save.
- The domain half is unit-assertable (`saveCount` advances on an identical replace, design §5.3)
  even though the DOM half is invisible to the suite.

**Negative / accepted**

- **No acceptance scenario can observe the mechanism.** Deliberate: an assertion there would pass
  in both shapes and read as coverage while providing none. Audibility is **VH-02(a)–(d)**, a human
  check with a real screen reader.
- **A `key` on a text node is unusual-looking React**, and a well-meaning cleanup could delete it
  without failing a single test. Mitigated by naming it in P8, in the module contract (§4.1), and in
  this ADR — three places a reader can find the reason.
- The mechanism rests on React's reconciliation behaviour, not on a browser guarantee. Accepted:
  it is the same bet ADR-0009 already made, and §5.4 measures it on the installed toolchain rather
  than assuming it.

## Related

ADR-0009 (the precedent), ADR-0019 (why the counter is a field of `Visit`), ADR-0022 (the region it
re-keys), VH-02, design R15, §2.4 INV-11/P7/P8/P12, §5.3, §5.4.
