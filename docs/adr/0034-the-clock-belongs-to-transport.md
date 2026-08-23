# ADR-0034 — The clock belongs to transport: `save` is handed a clock reading, and the domain never reads the time

- **Status:** Proposed — decided with the human in a `/grill-with-docs` session, pending the
  sdlc2 VERIFY gate
- **Superseded in part by:** the `saved-at` feature **as re-scoped after this record was written**
  (`.sdlc2/features/saved-at/feature.md`), which asks for a relative, self-updating stamp
  (*"saved 3 minutes ago"*), newest-first sorting, a most-recent marker, and a day-old cutoff.
  **Half of this record stands and half falls, and the split matters:**

  - **Stands.** The clock belongs to transport. The domain still never reads the time, the purity
    guard is still not edited, and options 1 and 2 are still rejected for the reasons given below.
  - **Falls.** What crosses the boundary. Every one of those four requirements has to *compare two
    times*, which a clock reading cannot do — so the value becomes the instant, and with it go
    minute precision, the structural guarantee that a stamp "cannot be aged", and the domain's
    ownership of the formatted text. In other words: **rejected option 3 is now the right one**, at
    exactly the cost recorded against it below.

  This is not a reversal discovered later. It is the trigger this record names in *"Where a real
  clock would attach"*, fired by the very next feature — before any code was written against the
  decision. The replacement is recorded by the `saved-at` run. A reader arriving here first should
  read that feature's design next.
- **Date:** 2026-08-23
- **Feature:** `saved-at` (not yet seeded — this record predates the sdlc2 run and is an input to it)
- **Deciders:** the human, in a grilling session (advisory: architect / architect-critic, when the
  feature runs)
- **Relates to:** ADR-0003 (the pure module and what message text it owns), ADR-0006 (no driven
  ports, and where one would attach), ADR-0008 (how purity is actually enforced), ADR-0020 (`save`
  took no argument), ADR-0035 (the record the reading is stored in)

## Context

Stamping each saved name with when it was saved needs a clock, and `src/visit.ts` is a module that
is not allowed one.

The prohibition is not incidental and it is not about I/O. `src/visit.test.ts` fails the build if
`visit.ts` mentions any of:

    localStorage sessionStorage indexedDB fetch XMLHttpRequest document window globalThis navigator Date Math.random

`Date` sits in that list beside `Math.random`, not beside `fetch`. The rule that line enforces is
**determinism**: `save(visit)` is a function of one value, which is why every rule it owns can be
asserted with a literal and no mock, no render and no clock. ADR-0008 wrote the guard; this ADR is
the first feature to want to cross it.

There is a second constraint pulling the other way. ADR-0003 put every piece of visitor-facing
**message text** in the domain — `Hello, `, `ALERT_MESSAGE`, the empty state, both refusal
sentences — so that `visit.ts` is the one file you read to know what the screen says. A saved-at
time is a fifth thing the screen says.

The two constraints do not both survive the obvious implementation, so one of them has to be
chosen against, deliberately.

## Options considered

1. **Call `Date.now()` inside `save`, and delete `Date` from the guard.**
   *Rejected.* It is a two-character diff and the smallest-looking one, which is exactly why it
   needs the loudest refusal. `save` would stop being a function of its inputs: every existing
   assertion about it would become time-dependent, and "the visit is replaced wholesale by a pure
   function of the visit" — the sentence the module is built on — would quietly stop being true. A
   guard that is amended to let a feature through is not a guard; it is a comment.

2. **Pass a clock function: `save(visit, clock)`.**
   *Rejected.* This is ADR-0006's driven port wearing a function as a disguise, and it buys nothing
   the option below does not: `save` is still non-deterministic on the inside, so its tests still
   need to control something, and the codebase gains an abstraction with exactly one real
   implementation and one fake.

3. **Store the instant (epoch milliseconds) and let the component format it.**
   *Rejected, and it is the mainstream answer, so its cost should be named rather than implied.*
   Rendering `1755973200000` as `14:35` needs `new Date(ms).getHours()`, which cannot happen in
   `visit.ts`; the formatter therefore moves to `GreetingScreen.tsx`. That leaves four visitor-facing
   projections in the domain and a fifth somewhere else, for no reason a reader could infer from
   either file. It is the right option the day a time has to be aged, sorted or compared — see the
   trigger recorded below.

4. **Have transport hand in a finished string: `save(visit, '14:35')`.**
   *Rejected.* The aggregate would then hold presentation, and the domain would own no formatting at
   all — the worst of both: an impure boundary *and* a domain that cannot say what the screen shows.

5. **Transport hands in a clock *reading* — the hour and the minute — and the domain formats it.**
   *(chosen)*

## Decision

`save` grows one argument: the clock reading at which the visitor pressed Save. Transport reads the
clock (`new Date()`), decomposes it, and hands the parts across; the domain pads and punctuates
them into the text the row shows, beside the four projections it already owns.

The guard's token list is **not edited**. `visit.ts` still mentions no `Date`.

**The reading is deliberately not an instant.** It carries an hour and a minute and nothing else, so
the stored value cannot be subtracted, sorted, or turned into an age. That is Question 1 of the
grill — the stamp is *provenance*, a record of when something happened, not a recency cue — made
structural rather than remembered: "the stamp is never recomputed into an age" is not a rule anyone
has to keep, it is a sentence that cannot be written.

**Precision is one minute.** Two names saved forty seconds apart share a saved-at time.

## Consequences

**Positive**

- The purity guard stays green without being touched, and `save` stays a total, deterministic
  function of its arguments. Its tests pass literals and assert exact text; nothing in this feature
  introduces a fake timer, a system-time override, or an injected clock.
- All five visitor-facing projections stay in one file, so ADR-0003's "read `visit.ts` to know what
  the screen says" survives this feature intact.
- The impure step lands in the click handler, which is the only place in the codebase that was
  already impure.

**Negative / accepted**

- **The domain can no longer vouch for the stamp.** It promises to store what it was handed, not
  that the time is true. A caller may pass any hour and minute — including one earlier than the row
  above — and every invariant still holds. ADR-0020 made a point of `save` taking *no* argument
  ("that absence is the guarantee"); after this, the guarantee about the *name* survives, but the
  shape that enforced it does not. Held by there being exactly one caller, and that caller being
  transport.
- **Stamps may disagree with list order.** The list is ordered by insertion and never sorted, so a
  backwards clock reading renders a correctly-ordered list with a backwards column. Deliberately not
  clamped to the previous row's time: storing `max(supplied, previous)` would make the one field
  whose whole job is recording when something happened permitted to lie. Recorded as a **known
  coupling, stated rather than engineered away** — the same treatment `SAVED_NAMES_LIMIT` and the
  word "Five" already get in `visit.ts`.
- **No test proves the component passes a real clock.** A handler that hardcoded midnight would
  render `Saved at 00:00` and leave every test green, because the DOM scenario asserts the *shape*
  `Saved at HH:MM` rather than a value it cannot predict. This is VH-06's situation exactly (an
  assertion that no scenario can make, handed to a person instead), and it is discharged the same
  way: a human-verify item — *save a name; confirm the row shows the clock time you saved it at.*
- **The instant is thrown away.** Nothing can later compute an age, order by time, or show a date
  without going back to option 3. The trigger is recorded below so that the next author does not
  rediscover it.
- **A visit spanning midnight shows `00:01` below `23:59`.** No date is displayed. Accepted: the
  display is time-of-day, the ordering is insertion, and a date on every row would be noise on a
  screen whose entire memory dies at unmount.

**Where a real clock would attach, when it earns its keep** — extending ADR-0006's list of named
future seams with a fourth: a clock port (or option 3's instant) belongs the moment anything needs
to *compare* two times — a relative "2 minutes ago", ordering by time, an elapsed duration, or a
date. Until then the honest shape is: transport reads the clock, the domain formats what it is told.

## Related

ADR-0003, ADR-0006, ADR-0008, ADR-0020, ADR-0035, `CONTEXT.md` (**Saved at**), `src/visit.test.ts`
(the purity guard this ADR declines to edit).
