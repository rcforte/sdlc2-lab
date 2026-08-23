# ADR-0036 — The saved-at moment is an instant, handed to `save` by transport

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `saved-at` (`.sdlc2/features/saved-at/design.md` §2.3, §2.4, §4.1)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Supersedes:** ADR-0034's *decision* (store an hour-and-minute clock reading). ADR-0034's
  *principle* — the domain never reads the clock, transport does — **stands unchanged and is
  restated below.**
- **Relates to:** ADR-0003 (the domain owns message text), ADR-0006 (no driven ports), ADR-0008 (the
  lexical purity guard), ADR-0020 (`save` took no argument), ADR-0026 (one aggregate), ADR-0035 (a
  saved name is a record), ADR-0037 (where the formatting lives)

## Context

`src/visit.ts` may not mention `Date`: `src/visit.test.ts` fails the build on a token list where
`Date` sits beside `Math.random`, not beside `fetch`. The rule that line enforces is **determinism**
(ADR-0008), and the seed is explicit: *"A guard amended to let a feature through is not a guard."*

ADR-0034 satisfied that by storing an hour-and-minute **clock reading** — deliberately a value that
*cannot* be subtracted, sorted or aged — and named the exact trigger for reversing itself: *"a clock
port (or option 3's instant) belongs the moment anything needs to compare two times."*

All four of this feature's requirements compare two times: the age reading subtracts, the marker
takes a maximum, the sort orders, the cutoff thresholds. The trigger has fired, before any code was
written against ADR-0034 (its stamp was never built). The seed settles this in *Decisions*: *"What is
stored is the instant, not a clock reading… its rejected option — store the instant, format outside
the domain — is now the right one."* This record is that decision made in the code, with the options
re-weighed rather than assumed.

## Options considered

1. **Call `Date.now()` inside `save` and delete `Date` from the guard.**
   *Rejected, for the reason ADR-0034 gave and this feature strengthens.* It is a two-character diff,
   which is why it needs the loudest refusal. `save` would stop being a function of its arguments,
   and this feature would then need `expire` and `ageReadingText` to read the clock too — three
   non-deterministic functions where there were none, and every existing literal-only assertion in
   `visit.test.ts` becomes time-dependent. The guard would have been amended to let a feature
   through, which is the definition of not having one.

2. **Inject a clock port: `save(visit, clock)`, `expire(visit, clock)`.**
   *Rejected.* This is ADR-0006's driven port wearing a function as a disguise, and it buys nothing
   over option 5: the domain functions stay non-deterministic on the inside, so their tests still
   have to control something, and the codebase gains an abstraction with exactly one real
   implementation and one fake. The seam that a clock port would have justified — *"the moment
   anything needs to compare two times"* — is satisfied by passing the compared value itself.

3. **Keep ADR-0034's clock reading and derive everything from it.**
   *Rejected, and it is the status quo, so its failure should be shown rather than asserted.* An
   hour-and-minute pair cannot answer "is this more than 24 hours old" at all (it has no day), and it
   answers "which is newer" wrongly across midnight. Its one-minute precision would also make every
   name saved in the same minute tie for the marker. It was a good decision for a stamp that only had
   to be *shown*; it cannot serve a stamp that has to be *compared*.

4. **Transport hands in finished strings** — the age reading and the stable time, computed outside.
   *Rejected.* The aggregate would hold presentation, and the age reading has to be recomputed
   continuously, so the aggregate would be rewritten on every tick — turning "the passage of time
   never writes to the list" (INV-27, INV-31) from a structural fact into a rule nobody could keep.

5. **Store the instant — epoch milliseconds — handed to `save` as one argument.** *(chosen)*

## Decision

`save` grows one argument: `save(visit, savedAt: number)`, the epoch-millisecond instant at which the
visitor pressed Save. `expire(visit, now: number)` takes the same kind of value. A saved name is
`{ name, savedAt }` (ADR-0035), and `savedAt` is written **only** in `save`'s append branch, so the
already-saved refusal cannot move an existing moment — which is what makes the product's
keep-not-refresh answer structural rather than remembered.

**The guard's token list is not edited.** `src/visit.ts` still mentions no `Date`. Every domain
function stays total, pure and synchronous, and every one of them can still be asserted with number
literals and no mock, no render and no clock. The impure read is `nowMs()` in `src/clock.ts`, called
from the component's event handler and its one interval (ADR-0037, ADR-0039).

## Consequences

**Positive**

- The four comparisons the feature needs are ordinary arithmetic on one field, in one aggregate. The
  marker, the sort and the cutoff read the same number, so they cannot disagree about which name is
  newer — the consistency the seed demanded of whatever answer was chosen.
- Determinism survives intact: the whole domain is still testable with literals, and `expire` — the
  one thing in this app that happens without the visitor — is a pure function of a visit and a
  number.
- `ADR-0034`'s cost list mostly evaporates: the stamp can be aged, ordered and expired, and no visit
  spanning midnight shows a smaller time below a larger one, because nothing displays a clock time on
  screen at all any more.

**Negative / accepted**

- **The domain still cannot vouch for the moment** (ADR-0034's consequence, carried forward
  unchanged). A caller may pass any number, including one earlier than the row above. Not clamped to
  the previous row's moment: `max(supplied, previous)` would let the one field whose job is recording
  when something happened tell a lie. Held by there being exactly one caller, and that caller being
  transport.
- **`save`'s no-argument guarantee (ADR-0020) is now fully spent.** It lost the name argument's
  protection in ADR-0029 and the rest here. What survives is that `save` still takes no *name*: the
  greeting is still the only possible source of a saved name.
- **One more number crosses the boundary on every tick.** `expire(visit, now)` is called ~5 760 times
  a day and returns its input unchanged almost every time. That identity return is load-bearing
  (INV-31), not an optimisation.
- **ADR-0034 is now a record of a decision that never shipped.** Left in place, superseded rather
  than deleted, because its *principle* is the one this feature obeys and its rejected options are
  the ones re-weighed above.

## Related

ADR-0003, ADR-0006, ADR-0008, ADR-0020, ADR-0034, ADR-0035, ADR-0037, ADR-0039,
`.sdlc2/features/saved-at/feature.md` (*Decisions*), `src/visit.test.ts` (the guard this ADR again
declines to edit).
