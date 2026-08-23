# ADR-0037 — The age reading stays in the domain; the wall-clock text moves to `src/clock.ts`

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `saved-at` (`.sdlc2/features/saved-at/design.md` §2.5, §3, §4.2)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0003 (the domain owns visitor-facing message text), ADR-0006 (no driven
  ports), ADR-0032 (one formatter per piece of copy), ADR-0034 (the clock belongs to transport),
  ADR-0036 (what crosses the boundary), ADR-0040 (what the row exposes)

## Context

Two pieces of text are derived from a saved-at moment:

- the **age reading** — `saved just now`, `saved 3 minutes ago`, `saved 1 hour ago` — recomputed
  continuously from the moment and now;
- the **stable absolute time** — `14:20` — computed once per row and never changing.

ADR-0003 put every visitor-facing sentence in `src/visit.ts` so that one file answers "what does the
screen say". ADR-0034 predicted that storing an instant would break that rule, listing as the cost of
its rejected option: *"the formatter therefore moves to `GreetingScreen.tsx` … four visitor-facing
projections in the domain and a fifth somewhere else."*

That prediction is **half right, and the half it gets wrong decides this record.** An age reading is
the *difference* of two instants: it needs no calendar, no timezone and no locale, so it is pure
arithmetic. A wall-clock time is a *projection onto a calendar*: `14:20` depends on where the visitor
is, and the only thing in the platform that knows that is `Date`.

## Options considered

1. **Move both formatters to `GreetingScreen.tsx`** (ADR-0034's prediction, taken literally).
   *Rejected.* It surrenders more of ADR-0003 than the constraint actually costs. The age reading is
   the text a visitor reads on every row, all the time; putting it in the component would put the
   feature's headline copy in the file that is supposed to own no copy, and would make the wording
   rules (floors, singular at exactly one, the `just now` band) unassertable without a render.

2. **Keep both in the domain by doing calendar arithmetic on epoch milliseconds** —
   `Math.floor(ms / 3_600_000) % 24` and friends.
   *Rejected, and it is the tempting one, because it typechecks and needs no `Date`.* It yields
   **UTC**, so every visitor not on Greenwich sees the wrong time on a row whose entire job is saying
   when. The seed is explicit that times are *"the browser's local wall clock"*. Re-deriving local
   time from `getTimezoneOffset()` would need `Date` anyway; hard-coding an offset would be worse than
   both.

3. **Store the formatted stable time in the aggregate**, handed in beside the instant at save time.
   *Rejected* — ADR-0034's option 4 in a new costume. The aggregate would hold presentation, two
   fields could disagree about the same moment, and `visit.test.ts` would assert a string the domain
   did not compute.

4. **A clock port injected into the domain** so a formatter inside `visit.ts` could ask for the
   local offset.
   *Rejected* for ADR-0006's and ADR-0036's reasons: one implementation, one fake, and a pure module
   that stops being pure to save one file.

5. **Split by what each text actually needs: the age reading stays pure and stays in the domain; the
   wall-clock text lives in a new transport module `src/clock.ts`.** *(chosen)*

## Decision

`ageReadingText(savedAt, now)` lives in `src/visit.ts` and is the only place the words
`saved just now`, `saved N minute(s) ago` and `saved N hour(s) ago` exist (INV-32).

`src/clock.ts` is a new module holding exactly three things: `nowMs()` (the only `Date` read in the
application), `clockTimeText(instant)` (local, 24-hour, zero-padded `HH:MM`, no date, no locale API),
and `TICK_MS`. It imports nothing from the domain; the domain imports nothing at all, so the two can
never meet. `GreetingScreen` imports it **directly** — it is a module, not an injected port.

The line the split falls on is stated in one sentence, so a future reader does not have to
rediscover it: **text derived from a *difference* of instants is pure and belongs to the domain; text
derived from an instant's *position on a calendar* is not and does not.**

## Consequences

**Positive**

- ADR-0003 survives where it matters: the feature's headline copy is in `visit.ts` with the four
  sentences already there, and its wording rules are asserted with number literals.
- There is exactly one file to open to find every clock read in the application, and its name says
  so. `Date` appears in one production module instead of being sprinkled across handlers.
- `clock.ts` has no domain knowledge and the domain has no clock knowledge, so neither can drift into
  the other's job.

**Negative / accepted**

- **One visitor-facing string now lives outside the domain**, and it is the one a screen-reader user
  hears. ADR-0003's promise becomes "read `visit.ts` for what the screen says, and `clock.ts` for the
  one string that needs a calendar". Written down here and in design.md §2.5 rather than left as an
  inference.
- **A fourth production module in a three-module app.** Justified by what it isolates (impurity), not
  by size: folding `nowMs` into the component would put `Date` beside JSX and make "where is the
  clock read" a grep instead of a file.
- **`clockTimeText` needs its own tiny unit test** (`src/clock.test.ts`), because no acceptance
  criterion pins the format — the feature explicitly leaves it to architecture. Three assertions,
  named in design.md §5.3 so they are not mistaken for drift.
- **Two saves in the same minute share a stable absolute time.** Rows are identified by name, not by
  time, so nothing depends on it being unique. Seconds were rejected as noise in a label a screen
  reader reads aloud on every row.

## Related

ADR-0003, ADR-0006, ADR-0032, ADR-0034, ADR-0036, ADR-0040, `CONTEXT.md` (**Saved at**).
