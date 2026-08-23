# Design — Saved at (`saved-at`)

> Input: `.sdlc2/features/saved-at/feature.md` (seed + product brief), `issues/01..04`,
> `mockup.html`. Existing merged code: `src/visit.ts`, `src/GreetingScreen.tsx`, `src/App.tsx`,
> `src/visit.test.ts`, `src/GreetingScreen.test.tsx`, and the merged ADRs `docs/adr/0001`–`0009`,
> `0019`–`0035`, plus `CONTEXT.md`. Output consumed by the `developer` node.
>
> This document designs the **domain model, the boundaries, the contracts, and the outer
> acceptance-test seam for each of the four slices**. It changes no acceptance criterion, no issue,
> no line of `feature.md` and no line of `mockup.html`.
>
> **The slice queue is not stated here.** The `Blocked by:` lines in `issues/` are the only place it
> lives and the only thing the build engine reads. This design declares no edge, restates no edge,
> and contradicts no edge (§5.5) [SD-07].
>
> **The seed is settled work.** Every decision in `feature.md` — the keep-not-refresh answer, the
> agreed copy, the 60-second refresh floor, the marker in both views, the exclusions — is carried
> forward verbatim and is not re-derived. This design spends itself on what the seed left to
> architecture: **how the clock crosses the pure boundary, who owns each new invariant, and what
> each slice is driven through.**
>
> **Numbering.** ADRs continue at **0036** (`0001`–`0009` and `0019`–`0035` are merged;
> `0010`–`0018` are claimed on the unmerged `slice/greeting-log/*` branches). Rules continue at
> **R28**, invariants at **INV-27**, presentation invariants at **P21**, non-functionals at
> **N13** — an id means one thing across this repo.

---

## 1. Problem understanding

### 1.1 What already exists (and is not redesigned here)

`greet-visitor`, `saved-name` and `remembered-names` are merged. One aggregate (`Visit`) lives in
the pure module `src/visit.ts`; one driving adapter (`src/GreetingScreen.tsx`) renders it. The visit
holds `savedNames: readonly string[]` — at most five, no duplicates, insertion order, identity is
the exact string (ADR-0028) — with `save`, `remove`, `greetAgain`, the private writer
`withSavedNames`, and the projections `greetingText`, `alertText`, `savedNamesHintText`,
`refusalText`. Every list write bumps `savedNamesRevision` (INV-21) so the polite live region speaks
again; removal moves focus to the region (P19); rows are keyed by name (ADR-0029).

Two merged constraints do the shaping here:

- **`src/visit.ts` may not mention `Date`.** `src/visit.test.ts` fails the build on a token list in
  which `Date` sits beside `Math.random`, not beside `fetch`: the rule is **determinism**, not I/O
  (ADR-0008). *A guard amended to let a feature through is not a guard* (seed, Decisions). **It is
  not edited by this feature.**
- **The domain owns visitor-facing message text** (ADR-0003), so a reader opens one file to know
  what the screen says.

Two merged ADRs are directly touched. **ADR-0034** stored an hour-and-minute *clock reading*
precisely so a stamp could not be aged or sorted, and named the trigger for reversing that: anything
that must compare two times. All four requirements here compare two times, so its rejected option —
**store the instant** — is now the right one (seed, Decisions; recorded as ADR-0036). **ADR-0035**
already decided a saved name becomes a record whose identity is the name alone; this design realises
it (INV-28).

### 1.2 Functional requirements, restated as rules

| ID | Rule | Source |
| --- | --- | --- |
| R28 | Every saved name records **the moment it was saved**, written when the name joins the list. Nothing but a write to the list can change it; a tick of the clock never can. | seed, Agreed scope |
| R29 | Each row shows an **age reading** — the moment expressed as human time relative to now — derived on every render and **never stored**. | seed |
| R30 | The age reading **stays current while the screen is open**, unprompted, refreshing **at least once every 60 seconds**. Below a minute: `saved just now`; from a minute: `saved N minute(s) ago`; from sixty minutes: `saved N hour(s) ago`; it never reaches a day. | seed + po Decisions + Agreed copy |
| R31 | **The passage of time is never announced.** The age reading is hidden from assistive technology and a **stable absolute time** takes its place on the row, changing only when the row itself changes. | seed |
| R32 | **Newest-first sorting is available** through a checkbox named `Newest first`. **Oldest-first stays the default**, exactly as the list reads today. The control is absent while nothing is saved. | seed + po Agreed copy + issue 03 |
| R33 | **Sorting is a view, not a reordering.** The visit goes on holding names in save order; nothing that reads the list — saving, removing, greeting again, the cutoff, the Name field's hint — sees a sorted list. | seed |
| R34 | The **newest name** (latest saved-at moment) carries the perceivable marker `Newest`, **in either view**, and exactly one row carries it at a time. | seed + po Decisions |
| R35 | A saved name **older than a day falls off on its own** — 24 hours from its moment, not a calendar boundary. Falling off is **a write to the list**, announced like every other write, and it frees a slot exactly as removing does. Unlike the visitor's own removal it **moves no focus**. | seed + issue 04 |
| R36 | **Re-saving an already-saved name keeps the original moment.** `Ada is already saved.` stands unchanged, and the moment does not move for the sort order, the marker or the cutoff. | po Decisions (settling the seed's open question) |
| R37 | Everything `remembered-names` does is unchanged: five-name limit, both refusals, greet-again, remove and its focus rule, the empty state, and the Name field's hint, which still names every saved name in **save order** and tells no times. | seed + issue 03 |

### 1.3 Non-functional / cross-cutting

| ID | Concern | Position |
| --- | --- | --- |
| N13 | **Cost of keeping the screen honest.** One `setInterval` for the whole screen, not one per row; each tick is one clock read and at most one state change. | P25 |
| N14 | **A live region whose text changes every tick.** The age reading sits inside the polite Saved names region. It is `aria-hidden`, so a tick mutates nothing in the accessibility tree and the region cannot speak on a tick (R31). Whether that holds with a real screen reader is a human check (VH-02). | P21 |
| N15 | **Test-time cost of simulating a day.** Measured: advancing 24 h against a 15 s interval costs **~5 ms** (§5.4). No slice needs a timeout bump. | §5.4 |
| N16 | **Determinism of the domain is unchanged.** `save`, `expire` and every projection stay pure functions of their arguments; no test needs a mock, a spy or an injected clock to assert a domain rule. | ADR-0036 |
| N17 | **Staleness.** Between ticks the age reading may lag reality by up to one tick period (15 s), and a stale row survives up to one tick period past its 24 h mark. Accepted, and named so a reader does not read it as a bug. | ADR-0039 |

### 1.4 Explicit non-goals (from the seed, restated so the design can be checked against them)

No persistence (a visit still dies at unmount; nothing is written to web storage). No absolute
**dates** on screen — the stable absolute time is a time of day. No locale or timezone handling: no
`toLocaleString`, no i18n, one fixed format on the browser's local wall clock. No sort other than by
saved-at moment and no manual reordering. No change to what a saved name is: identity is still the
exact string, five is still the limit. No refresh-on-re-save and no "refresh but still call it a
refusal" (ruled out in the seed and again by the po).

---

## 2. Domain model

### 2.1 Bounded context

**Still one context: `Greeting`.** Nothing here creates a second one. The clock is not a context and
not a collaborator: it is an ambient reading taken at the impure edge and passed inward as a plain
number. There is still **no integration, no anti-corruption layer and no driven port** (ADR-0006
stands, and ADR-0036 explains why a clock port is still refused).

The app shell (`App`, `AppBanner`, `main.tsx`) remains a composition root that knows none of these
rules.

### 2.2 Ubiquitous language → code names

| Term (seed / po) | Code name | Kind |
| --- | --- | --- |
| **Saved name** (now a record) | `SavedName = { readonly name: string; readonly savedAt: number }` | Value object (identity: `name` alone — ADR-0035) |
| **Saved-at moment** | `savedAt: number` — epoch milliseconds, written once at the append | Value |
| **Saving** | `save(visit, savedAt): Visit` — grows one argument, still no name argument | Command |
| **Age reading** | `ageReadingText(savedAt, now): string` → `saved just now` / `saved N minute(s) ago` / `saved N hour(s) ago` | Derived value (never stored) |
| **Stable absolute time** | `clockTimeText(instant): string` → `14:20` — in `src/clock.ts`, **not** in the domain (ADR-0037) | Derived value (never stored) |
| **Newest name** | `newestSavedName(visit): string \| null` | Derived value |
| **Newest marker** | the `Newest` span on a row (P23) | Driving-adapter detail |
| **Sort view** | `savedNamesInView(visit, newestFirst): readonly SavedName[]` | Derived value (never stored) |
| **Newest first control** | the checkbox named `Newest first`, backed by `useState<boolean>` in the component (P24) | Driving-adapter detail |
| **Falls off** | `expire(visit, now): Visit` — a **command**, not a display rule | Command |
| *a day* | `DAY_MS = 24 * 60 * 60 * 1000`, module-private in `src/visit.ts` beside `expire` | Constant |
| *now, kept current* | `now: number` — `useState` in the component, refreshed by one `setInterval` (P25) | Driving-adapter state |
| *how often it refreshes* | `TICK_MS = 15_000` in `src/clock.ts` | Constant (transport policy) |
| *reading the clock* | `nowMs(): number` in `src/clock.ts` — **the only `Date` in the app outside a test** | Driving-adapter detail |

Carried over unchanged: **Visitor, Name, Greeting, Blank name, Trimmed, Fresh visit, Status region,
Alert, Saved names region, Row, Already saved, Full, Removing, Greeting again, Saved-name hint**.
Nothing is retired by this feature — this is the first feature in this repo that only adds.

**`CONTEXT.md` gains the new nouns** (*age reading*, *stable absolute time*, *newest marker*, *sort
view*, *falls off*) with the wording the seed's *Ubiquitous language* already fixes, and its
**Saved at** entry loses its "is being decided by the `saved-at` feature" hedge. Glossary only — no
rules, no signatures (its own house rule).

### 2.3 The aggregate

```
Aggregate root: Visit      (in-memory, per mount, no identity, no persistence)
  state
    greetedName            : string | null        -- unchanged                        (INV-2)
    greetingCount          : number               -- unchanged                        (INV-8a)
    lastSubmissionWasBlank : boolean              -- unchanged                        (INV-5a)
    blankCount             : number               -- unchanged                        (INV-8b)
    savedNames             : readonly SavedName[] -- ELEMENT TYPE CHANGES, nothing else (INV-17, INV-27)
    lastSaveRefusal        : SaveRefusal | null   -- unchanged                        (INV-20)
    savedNamesRevision     : number               -- unchanged                        (INV-21)
  commands  (all pure, total, synchronous; replace the value wholesale, never mutate)
    submit(rawName)        -- unchanged; carries the three list fields through        (INV-23)
    save(savedAt)          -- appends {name, savedAt}, or refuses                     (INV-17, INV-27)
    remove(name)           -- unchanged                                               (INV-19)
    greetAgain(name)       -- unchanged                                               (INV-22)
    expire(now)            -- NEW. drops every name older than a day; identity if none (INV-31)
  private (module-scoped, not exported)
    withSavedNames(names, refusal)   -- unchanged: the ONLY writer of the three list fields
    holds(savedNames, name)          -- NEW. the ONLY place a name is compared to a saved name (INV-28)
    byNewestFirst(savedNames)        -- NEW. the ONLY ordering by moment                (INV-29)
  projections (pure reads, no state)
    greetingText() · alertText() · refusalText()          -- unchanged
    savedNamesHintText()   -> `Saved: ` + names in SAVE order, no times     (INV-25, unchanged promise)
    ageReadingText(savedAt, now) -> the age words                            (INV-32)
    newestSavedName()      -> the name with the latest moment, or null       (INV-29)
    savedNamesInView(newestFirst) -> the display order; never stored         (INV-29, INV-30)
```

**Still exactly one aggregate, and no operation spans two.** Every new operation reads and writes
the same value: `save` reads `greetedName` and writes the list; `expire` reads and writes the list
alone; every projection is a pure read of one `Visit`. There is no second aggregate, no second hook
holding domain state, and therefore no cross-aggregate transaction to coordinate in a click handler.
ADR-0026's splitting tripwire — *split when two fields can change independently for reasons that
never coincide* — is re-run in ADR-0036 and **still not tripped**: `Visit` keeps its seven fields and
only the element type of one changes.

**Entities:** none, still. A `SavedName` is a value object whose equality is defined on one of its
two fields (ADR-0035, unchanged) — the trap that creates is named there and mitigated by there being
exactly one place the comparison happens (INV-28). **Domain events:** none; the "announcement" is an
ARIA live region, not a bus (ADR-0006). **New value objects:** `SavedName` only. `savedAt` is a plain
`number` and deliberately not a branded type: it is written at exactly one call site and read by
three pure functions in the same module, so a brand would buy a compile error nobody can currently
provoke.

### 2.4 Invariants and their owners

Every invariant names **exactly one enforcement point** — one function or one component a reader can
open.

| ID | Invariant | Single owner | How it is enforced there |
| --- | --- | --- | --- |
| INV-27 | **A saved-at moment is written once, by the write that adds the name, and never again.** No tick, no re-render, no sort, no refused save and no removal can change it (R28, R36). | `save` in `src/visit.ts` | `save` is the only function that **constructs** a `SavedName`, and it does so only in its append branch: `[...savedNames, { name, savedAt }]`. The already-saved branch returns the list **by reference** with a refusal (so re-saving cannot move a moment — R36 is structural, not remembered); `remove` and `expire` only `filter`, and a filter cannot rewrite a field; `submit` carries the list through (INV-23). No setter exists. |
| INV-28 | **Identity is the name alone.** The duplicate check, the removal, the greet-again guard and the hint all compare names and ignore moments (ADR-0035, ADR-0028 unchanged in substance). | `holds(savedNames, name)` in `src/visit.ts` (module-private) | One predicate — `savedNames.some((saved) => saved.name === name)` — used by `save`, `remove` and `greetAgain`, so `===` on the already-trimmed text exists in exactly one expression instead of three. `remove`/`expire` filter on the same field. The fifth reader, the React `key`, is the component's and is P22. |
| INV-29 | **One ordering rule serves both the marker and the newest-first view: descending by saved-at moment, ties broken by the later insertion first.** The newest name is that order's first element. The marker and the sort therefore **cannot disagree**. | `byNewestFirst(savedNames)` in `src/visit.ts` (module-private) | `[...savedNames].reverse().sort((a, b) => b.savedAt - a.savedAt)` — reversing first makes the *later* insertion win a tie under `Array.prototype.sort`'s guaranteed stability. `newestSavedName` returns `byNewestFirst(...)[0]?.name ?? null`; `savedNamesInView(visit, true)` returns `byNewestFirst(...)`. Ties are not exotic: several saves inside one fake-timer instant tie exactly, and a plain descending sort would then leave the display in save order and fail issue 03 (§5.4, measured). |
| INV-30 | **Sorting is a view: nothing that reads the list can see a sorted list** (R33). | the **shape of `Visit`**, enforced by `savedNamesInView` in `src/visit.ts` | The sort flag is **not a field of the aggregate** and is never passed to any command — it is an argument to one projection that returns a new array and stores nothing. `visit.savedNames` is still written only by `withSavedNames`, so `save`, `remove`, `greetAgain`, `expire` and `savedNamesHintText` read save order because there is no other order to read. Unrepresentable rather than forbidden. |
| INV-31 | **After `expire(visit, now)` no saved name has `now - savedAt > DAY_MS`; every dropped name leaves through the ordinary list write (revision +1, refusal cleared); and a tick that drops nothing returns the visit by identity** — no write, no event, no announcement (R35, R31). | `expire` in `src/visit.ts` | One `filter` on the strict comparison (so exactly 24 h old **stays** — "older than a day"), then `kept.length === savedNames.length ? visit : withSavedNames(visit, kept, null)`. Reusing `withSavedNames` is what makes falling off *a write like any other* rather than a second kind of mutation, and the identity return is what keeps the passage of time silent. `DAY_MS` is a constant beside the rule, never a number in a component. |
| INV-32 | **The age reading's words**, and the only place they exist: elapsed `< 60_000` ⇒ `saved just now`; `< 3_600_000` ⇒ `saved N minute(s) ago`; otherwise `saved N hour(s) ago`. Whole units, floored, singular at exactly one. Elapsed is clamped at zero, so a `now` earlier than the moment reads `saved just now` and never `saved -1 minutes ago`. | `ageReadingText` in `src/visit.ts` | A total pure function of two numbers with `Math.max(0, now - savedAt)` and `Math.floor`. It needs no calendar — an elapsed span is the *difference* of two instants and is therefore timezone-free, which is exactly why this projection can stay in the pure module while `clockTimeText` cannot (ADR-0037). It never reaches days: INV-31 removes the row first (po Decisions). |
| INV-33 | **The domain never reads a clock.** `save` and `expire` receive the instant; `src/visit.ts` mentions no `Date`, and the guard's token list is **not edited**. | the existing INV-6b lexical guard in `src/visit.test.ts` | Mechanism unchanged (ADR-0008). This feature's only obligation is to keep passing it, which storing a `number` and doing arithmetic does. Where the clock *is* read is P25 and `src/clock.ts`. |

**Presentation invariants** (owned by `GreetingScreen` and nothing else — the domain still knows
nothing of ARIA, roles, ids or element shape). P10, P12–P20 are unchanged and are not restated.

| ID | Invariant | Enforced by |
| --- | --- | --- |
| P21 | Each row renders its **age reading** as `<span aria-hidden="true">{ageReadingText(saved.savedAt, now)}</span>`, after the name and before the controls. It is **the only node in the region whose text changes on a tick**, and `aria-hidden` is what keeps a tick out of the accessibility tree — so the polite region cannot announce the passage of time (R31, N14). | One span, one attribute. `aria-hidden` here is not decoration-hiding: it is the mechanism of a stated requirement, and it is why the stable time (P22) has to exist at all. |
| P22 | Each row is ``<li key={saved.name} aria-label={`${saved.name}, saved at ${clockTimeText(saved.savedAt)}`}>``. That accessible name is the **stable absolute time** in the age reading's place, and it changes only when the row's own name or moment changes — i.e. **never, for the life of the row**. | One attribute, computed from two immutable fields. A `listitem` takes no accessible name from its contents, so an `aria-label` is what makes the row's name assertable at all (ADR-0040; measured §5.4). `key={saved.name}` is still legitimate because INV-17 forbids duplicates, and it is what keeps an untouched row's DOM nodes — and the focus inside them — across an append, a removal **and a re-sort** (measured §5.4). |
| P23 | Each row renders `{isNewest && <span>Newest</span>}` where `isNewest` is `newestSavedName(visit) === saved.name`, **in both views** (po Decisions). Exactly one row can satisfy it, because the projection returns one name and names are unique (INV-17). | One comparison against one projection. The component never scans the list for a maximum, so the marker cannot develop a second definition. Not `aria-hidden`: a screen-reader visitor gets the same answer to "which is newest" as a sighted one. |
| P24 | The **newest-first control** is rendered **iff** `visit.savedNames.length > 0`, inside the region, **before** the rows: `<input type="checkbox" id={SORT_CONTROL_ID} checked={newestFirst} onChange={…}>` with `<label htmlFor={SORT_CONTROL_ID}>Newest first</label>`. | One `{visit.savedNames.length > 0 && …}`. A real checkbox, never a button with `aria-pressed`: the acceptance criteria query a checkbox by accessible name and read its checked state, and the mockup draws one. Position is the mockup's. |
| P25 | **One tick for the whole screen.** Exactly one `useEffect(() => { const id = setInterval(…, TICK_MS); return () => clearInterval(id) }, [])`, whose callback takes **one** clock reading and feeds both consumers: `const n = nowMs(); setNow(n); setVisit((v) => expire(v, n))`. No other timer exists, and no timer is per row. | One effect with a cleanup, so a remount cannot leak a second interval (StrictMode mounts effects twice in development). One reading per tick is what keeps the age reading and the cutoff from disagreeing inside a single tick. |
| P26 | **Every clock reading is taken outside the state updater**: `const at = nowMs(); setVisit((v) => save(v, at))`, never `setVisit((v) => save(v, nowMs()))`. | React may invoke an updater twice (StrictMode does, in development). An updater that reads the clock is not a pure function of its argument and can produce two different moments for one press. The rule keeps the impurity in the handler, where it is already. |
| P27 | Rows are rendered from `savedNamesInView(visit, newestFirst)` and **the component never sorts, reverses or compares moments itself**. | One call. `newestFirst` is `useState<boolean>(false)` — screen state, never domain state (INV-30). Its default `false` is oldest-first (R32). |

> **What is deliberately *not* an invariant.** There is no rule that moments increase down the list:
> ADR-0034 already accepted that the domain cannot vouch for a supplied instant, and INV-29 handles a
> backwards one by trusting the moment, which is what the seed defines "newest" as. There is no rule
> that the marker is on the top row under newest-first — that is a *consequence* of INV-29, and
> asserting it separately would be a second definition of newest. There is no runtime assertion that
> the age reading was refreshed: the tick either runs or the screen visibly freezes.

### 2.5 Where visitor-facing text lives

Unchanged in principle: the **domain owns the messages**, the **component owns element shape and
control names**. The age reading joins the domain's list — `saved just now` / `saved N minute(s)
ago` / `saved N hour(s) ago` live in `ageReadingText` and nowhere else (INV-32) — so ADR-0003's *read
`visit.ts` to know what the screen says* survives this feature almost intact.

**Almost, and here is the exception, stated rather than discovered.** The **stable absolute time**
(`14:20`) is formatted in `src/clock.ts`, because turning an instant into the visitor's *local* wall
clock needs a calendar, and a calendar is `Date`. Doing it with arithmetic on epoch milliseconds
would produce UTC, which is the wrong time for every visitor not on Greenwich — a row whose whole job
is to say when. So one visitor-facing (assistive-technology-facing) string lives outside the domain,
in a module named for the reason. ADR-0037 records it, including the options that would have kept it
inside and what each would have cost.

**Two known couplings, stated rather than engineered away:**

1. `TICK_MS = 15_000` (transport policy) and the product rule *"refreshes at least once every 60
   seconds"* (R30) must agree, and nothing enforces it. Any period `≤ 60_000` satisfies the rule;
   15 s was chosen for staleness (N17) and costs ~5 ms per simulated day in tests (§5.4).
2. The seam fakes exactly `setInterval`, `clearInterval` and `Date` (§5.4), which pins P25's choice of
   `setInterval`. A tick re-implemented with `setTimeout` chains would not be advanced by the
   scenarios. Recorded in ADR-0041 and worth a comment at the effect.

---

## 3. Architecture

Unchanged in shape: a **modular monolith of one context**, a pure domain module, one driving adapter
— plus **one new transport-side module** whose entire job is to hold the impurity the domain refuses.
No new dependency; nothing is added to `package.json`.

```
                       ┌────────────────────────────────────────────────────────┐
  visitor ── DOM ────► │  Driving adapter:  src/GreetingScreen.tsx               │
  (RTL + user-event)   │  • useState<string>  rawName        (draft, INV-6c)     │
                       │  • useState<Visit>   visit          (INV-6a, INV-24)    │
                       │  • useState<number>  now            (P25)   NEW         │
                       │  • useState<boolean> newestFirst    (P27)   NEW         │
                       │  • useRef<HTMLElement> savedNamesRegion (P19)           │
                       │  • one setInterval, one clock read per tick (P25, P26)  │
                       │  • element shape, ids, ARIA, control names (P10..P27)   │
                       └──────┬──────────────────────────────────────┬───────────┘
                              │ commands + projections               │ nowMs() · clockTimeText()
                              │ (plain calls, no port object)        │ TICK_MS
            ┌─────────────────▼──────────────────────┐   ┌───────────▼────────────────────────┐
            │  Domain:  src/visit.ts                  │   │  src/clock.ts        (NEW, impure) │
            │  pure · total · synchronous             │   │  the ONLY module that reads the    │
            │  Visit aggregate — one boundary         │   │  time or turns an instant into     │
            │    submit · save(savedAt) · remove      │   │  wall-clock text                   │
            │    greetAgain · expire(now)             │   │    nowMs(): number                 │
            │    withSavedNames · holds · byNewestFirst│   │    clockTimeText(instant): string  │
            │    greetingText · alertText             │   │    TICK_MS                         │
            │    savedNamesHintText · refusalText     │   │  imports nothing but Date          │
            │    ageReadingText · newestSavedName     │   └────────────────────────────────────┘
            │    savedNamesInView                     │
            │  imports nothing · no browser global    │      Direction of dependency:
            │  (INV-6b/INV-33, guarded — ADR-0008)    │      component → clock,  component → visit
            └─────────────────────────────────────────┘      clock ↮ visit  (they never meet)

  App / AppBanner / main.tsx : composition root. Knows none of the above.
  Driven side                : still none. No repository, no storage, no network, and no clock port —
                               the clock is read at the edge and handed inward as a number (ADR-0036).
```

**Data flow of one tick** (the only thing in this app that happens without the visitor):

```
setInterval fires
  └─ n = nowMs()                                   ← the one impure read (src/clock.ts)
     ├─ setNow(n)          ──► re-render ──► ageReadingText(savedAt, n) per row   (aria-hidden: silent)
     └─ setVisit(v => expire(v, n))
            ├─ nothing older than a day → returns v BY IDENTITY → React bails out → no announcement
            └─ something is → withSavedNames(kept, null) → revision +1 → rows change → region speaks
```

**Data flow of one save:** `const at = nowMs(); setVisit(v => save(v, at))` — the clock read is in the
handler, outside the updater (P26), and the aggregate is replaced by a pure function of two values.

---

## 4. Contracts

### 4.1 Domain module — `src/visit.ts`

```ts
export const ALERT_MESSAGE = 'Please enter your name.'                     // unchanged
export const NOTHING_SAVED_MESSAGE = 'No names saved yet.'                 // unchanged
export const FULL_LIST_MESSAGE = 'Five names is the limit. Remove one to save another.'
export const SAVED_NAMES_LIMIT = 5                                         // unchanged

export type SaveRefusal =                                                  // unchanged
  | { readonly kind: 'already-saved'; readonly name: string }
  | { readonly kind: 'full' }

/** INV-27, INV-28. Identity is `name`; `savedAt` is epoch ms, written once (ADR-0035, ADR-0036). */
export type SavedName = { readonly name: string; readonly savedAt: number }

export type Visit = {
  readonly greetedName: string | null
  readonly greetingCount: number
  readonly lastSubmissionWasBlank: boolean
  readonly blankCount: number
  readonly savedNames: readonly SavedName[]     // element type changes; [] on a fresh visit
  readonly lastSaveRefusal: SaveRefusal | null
  readonly savedNamesRevision: number
}

export const newVisit: Visit                                               // unchanged values

export function isBlank(rawName: string): boolean                          // unchanged
export function submit(visit: Visit, rawName: string): Visit               // unchanged + INV-23
export function save(visit: Visit, savedAt: number): Visit                 // + INV-27
export function remove(visit: Visit, name: string): Visit                  // unchanged (INV-19, INV-28)
export function greetAgain(visit: Visit, name: string): Visit              // unchanged (INV-22, INV-28)
export function expire(visit: Visit, now: number): Visit                   // NEW (INV-31)

export function greetingText(visit: Visit): string                         // unchanged
export function alertText(visit: Visit): string | null                     // unchanged
export function savedNamesHintText(visit: Visit): string | null            // INV-25: names, save order
export function refusalText(visit: Visit): string | null                   // unchanged
export function ageReadingText(savedAt: number, now: number): string       // NEW (INV-32)
export function newestSavedName(visit: Visit): string | null               // NEW (INV-29)
export function savedNamesInView(visit: Visit, newestFirst: boolean): readonly SavedName[]  // NEW (INV-29, INV-30)

// module-private, NOT exported
const DAY_MS = 24 * 60 * 60 * 1000
function withSavedNames(visit, savedNames, refusal): Visit                 // unchanged, now also used by expire
function holds(savedNames: readonly SavedName[], name: string): boolean    // NEW (INV-28)
function byNewestFirst(savedNames: readonly SavedName[]): readonly SavedName[]  // NEW (INV-29)
```

Behavioural contract, in words a test can be written from (rows in **bold** are new or changed):

| Call | Precondition | Result |
| --- | --- | --- |
| **`save(v, at)`** | `v.greetedName === null` | `v` itself (identity). No revision bump. *(unchanged)* |
| **`save(v, at)`** | greeted, name already saved | list unchanged **by reference — the existing moment is untouched (R36)**, `lastSaveRefusal = {already-saved, name}`, revision +1 |
| **`save(v, at)`** | greeted, not saved, five saved | list unchanged, `lastSaveRefusal = {full}`, revision +1 |
| **`save(v, at)`** | greeted, not saved, fewer than five | `[...savedNames, { name: greetedName, savedAt: at }]`, refusal `null`, revision +1 |
| **`expire(v, now)`** | no saved name older than a day | `v` itself (identity). **No revision bump, no announcement.** |
| **`expire(v, now)`** | one or more older than a day | those entries gone, order of the rest kept, refusal `null`, revision +1 |
| **`expire(v, now)`** | a name exactly `DAY_MS` old | it **stays** — the rule is *older than* a day (`>`), not *at least* |
| **`ageReadingText(at, now)`** | `now - at` in `[0, 60_000)` — including negative, clamped | `saved just now` |
| **`ageReadingText(at, now)`** | `[60_000, 3_600_000)` | `saved 1 minute ago` at exactly one minute, else `saved N minutes ago` |
| **`ageReadingText(at, now)`** | `>= 3_600_000` | `saved 1 hour ago` at exactly one hour, else `saved N hours ago` |
| **`newestSavedName(v)`** | list empty | `null` |
| **`newestSavedName(v)`** | otherwise | the name with the latest moment; on a tie, the **later insertion** |
| **`savedNamesInView(v, false)`** | any | `v.savedNames` — save order, the merged default (R32) |
| **`savedNamesInView(v, true)`** | any | a **new array**, latest moment first, ties later-insertion-first; `v` untouched |
| `remove` · `greetAgain` · `submit` · the three merged projections | any | unchanged behaviour; they compare and join `.name` |

**Oldest-first is insertion order, not an ascending sort by moment.** R32 says the default reads
"exactly as the list reads today", and today's order is the order names were saved. Only the
newest-first view consults moments. This matters when a supplied instant is out of order: the default
view still shows save order, which is what "nothing moves unless the visitor asks it to" means.

### 4.2 Transport module — `src/clock.ts` (new)

```ts
/** How often the screen re-reads the clock. Any value <= 60_000 satisfies R30. */
export const TICK_MS = 15_000

/** The one clock read in the application. Everything downstream is a pure function of its result. */
export function nowMs(): number                    // Date.now()

/** The stable absolute time: local wall clock, 24-hour, zero-padded `HH:MM`. No date, no locale. */
export function clockTimeText(instant: number): string
```

Three rules about this file, so it does not become a junk drawer: it holds **only** what needs the
current time or a calendar; it imports nothing from `src/visit.ts` (and `visit.ts` imports nothing at
all, so they can never meet); and it is imported by `GreetingScreen` **directly**, not injected — a
port with one implementation and one fake is the abstraction ADR-0006 refused and ADR-0036 refuses
again.

### 4.3 Component contract — `src/GreetingScreen.tsx`

State: the two existing hooks and the existing ref, **plus two pieces of screen state** — `now`
(P25) and `newestFirst` (P27). Neither is domain state: `now` is a reading of the outside world and
`newestFirst` is a view preference the seed explicitly refuses to let the domain see (INV-30).

Region markup, top to bottom: `<h2>Saved names</h2>` · the refusal `<p>` when there is one (P14) ·
**the `Newest first` checkbox when anything is saved (P24)** · the empty state **or** the `<ul>` of
rows (P15) · the save control when there has been a greeting (P17). Row contents, in DOM order
(P16 extended): the name · **the age reading (P21)** · **the `Newest` marker when it applies (P23)**
· `Greet me again as <name>` · `Remove <name>`. The destructive control stays last (ADR-0031).

**No new component.** ADR-0025's extraction tripwire, restated by ADR-0033 as *extract
`SavedNamesRegion` when it needs state of its own, or when a second screen renders it*, is **tripped
on its first clause** by `now` and `newestFirst`. It is re-run rather than obeyed by reflex, and the
answer is still no — with the reasoning and the sharpened tripwire in ADR-0041, because a tripwire
that fires and is ignored without a record is a tripwire that has stopped working.

**One behaviour no criterion fixes:** `newestFirst` survives the list emptying and refilling (it is
screen state, and the control merely stops being rendered while nothing is saved). Nothing asserts
it either way; recorded as VH-04.

### 4.4 What this feature changes in the merged suite

This feature **retires nothing** — no merged scenario is contradicted by it, which is a first for
this repo and worth checking against rather than assuming. Three mechanical consequences:

| Merged test (file) | Fate | Why |
| --- | --- | --- |
| `visit.test.ts` — the three `save(...)` call sites (`does nothing when there is no greeting to save`, `counts a refused save as a write of its own`, and the `remove` setup) | **adjust the call**, in the slice that changes the signature | `save(v)` becomes `save(v, <a literal instant>)`. The assertions themselves are unchanged — that they remain literal-only is the evidence that ADR-0036 kept the domain deterministic. |
| `visit.test.ts` — INV-6b purity guard | **must stay green, unedited** | The whole point (INV-33). If it goes red, the fix is in `visit.ts`, never in the guard. |
| `GreetingScreen.test.tsx` — every row assertion | **expected to keep passing as written** | Rows are asserted with substring `toHaveTextContent(name)` or scoped `within(row)` queries, never anchored regexes (the merged suite documents this trap), so the age reading and the marker joining a row's text content break nothing. Verified by reading all row assertions, not assumed. |
| `GreetingScreen.test.tsx` — the `never writes to web storage` constraint test | **keep; its exercise path may gain a tick** | Its sanctioned exception status (CLAUDE.md) is unchanged. A tick writes nothing, and asserting that costs one line in a test that already exists. Not an acceptance criterion, and no Gherkin step is added for it. |

---

## 5. The seam — per slice

**Seam family (all four slices):** the project's declared frontend seam — **React Testing Library +
user-event via Vitest (jsdom)** — driving the rendered DOM by role and accessible name. All **29**
acceptance scenarios are driven through it. No slice introduces a different kind of acceptance test,
and none needs a backend seam (`seam.backend: ""`). Run with `npm test -- --run`; typecheck with
`npm run build`.

**One entry point for the whole feature: `render(<GreetingScreen />)`**, in
`src/GreetingScreen.test.tsx`. `src/App.test.tsx` gains **no** `it`: no acceptance criterion here
mentions the app shell, and ADR-0005's tripwire says a second `it` there is the signal the suite has
begun duplicating itself.

**The time control every slice needs (measured, §5.4 — do not improvise it):**

```ts
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] }))
afterEach(() => vi.useRealTimers())
// …and advance with:  await act(async () => { vi.advanceTimersByTime(60_000) })
```

`setTimeout` is deliberately **left real**: React Testing Library's fake-timer detection only
recognises *jest*, so under a full `vi.useFakeTimers()` its async wrapper awaits a `setTimeout(0)`
that can never fire and **every `await user.click(...)` in the file hangs until the test times out**.
Faking `setInterval` + `Date` alone advances the tick and the clock, leaves user-event untouched, and
needs no `advanceTimers` option and no `globalThis.jest` shim (both alternatives are in ADR-0041).

| Slice | Issue | Kind | Outer seam (file · entry point · the queries and controls it turns on) | Scenarios | Production change |
| --- | --- | --- | --- | --- | --- |
| 01 | `01-every-saved-name-shows-when-it-was-saved` | **red-first** | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` · `vi.setSystemTime(...)` for a known wall clock · `within(row).getByText('saved just now')` and `toHaveTextContent('saved 2 minutes ago')` for the reading · `expect(row).toHaveAccessibleName('Ada, saved at 14:20')` and a second assertion after advancing, for the stable time · `expect(row).not.toHaveAccessibleName(/ago\|just now/)` · `act` + `advanceTimersByTime` for "with the visitor doing nothing" · `queryByText(/ago/)` for the empty state | **7** | `visit.ts`: `SavedName`, `save(visit, savedAt)`, `holds`, `ageReadingText`, and the mechanical `.name` change at the five identity sites (INV-27, INV-28, INV-32). `clock.ts`: whole file. `GreetingScreen.tsx`: `now` state + the tick effect without `expire` (P25, P26), the age reading span (P21), the row's `aria-label` (P22). Plus §4.4's call-site adjustments and the two named unit assertions (§5.3) |
| 02 | `02-the-newest-saved-name-is-marked` | **red-first** | same file · same entry point · `within(row).getByText('Newest')` · `within(region).getAllByText('Newest')` with length 1 for "exactly one" · `queryByText('Newest')` for absence · the merged `Remove Bob` and `Save this name` controls for the marker moving | **6** | `visit.ts`: `byNewestFirst`, `newestSavedName` (INV-29, the ordering half). `GreetingScreen.tsx`: the marker span (P23) |
| 03 | `03-sort-the-list-newest-first` | **red-first** | same file · same entry point · `getByRole('checkbox', { name: 'Newest first' })` + `toBeChecked()` · `user.click(checkbox)` · `getAllByRole('listitem')` index order for both views · `toHaveAccessibleDescription('Saved: Ada, Bob, Cleo')` for the hint staying in save order · `queryByRole('checkbox', …)` for its absence · the merged `Remove Bob` control | **9** | `visit.ts`: `savedNamesInView`, reading the same ordering rule (INV-29, INV-30). `GreetingScreen.tsx`: `newestFirst` state, the checkbox + label (P24), rows rendered from the view (P27) |
| 04 | `04-a-saved-name-older-than-a-day-falls-off` | **red-first** | same file · same entry point · `act` + `advanceTimersByTime(86_400_000 + TICK)` for a day passing · `queryByText`/`getAllByRole('listitem')` for the row's absence and survival at 23 h 59 m · `vi.setSystemTime(23:50)` for the midnight-crossing scenario · `nameField.focus()` + `toHaveFocus()` after the row goes · five saves then `Save this name` for the freed slot · `within(row).getByText('Newest')` for the marker after the fall | **7** | `visit.ts`: `expire`, `DAY_MS` (INV-31). `GreetingScreen.tsx`: the `expire` call inside the existing tick effect (P25). One more unit assertion (§5.3) |

Every slice is one sitting: one test file, one component, at most two modules, each compiling and
passing on its own under `strict` + `noUnusedLocals`. **Each slice is end-to-end** — it changes the
aggregate, the render, and the words or order a visitor perceives, and is proven through the one
seam above. None of them can be built as "domain only" and left invisible: slice 01's moment is
proven by a row's text, slice 02's ordering by a marker, slice 03's projection by row order, slice
04's command by a row disappearing while the screen sits untouched.

### 5.1 Which slices are red-first, and the one thing that must not be faked

**All four are red-first**, which is unusual for this repo and is the direct consequence of the
feature adding capability rather than reshaping it. Each has scenarios that cannot pass until
production code changes: no moment exists (01), no marker exists (02), no control exists (03), no
expiry exists (04).

**Four** scenarios **inside** those slices are guards rather than drivers, and are named so they are not
mistaken for tautologies — each is the po's re-save decision (R36) checked at one of the three
consumers of the moment, exactly as the seed demanded ("whichever it is, that answer has to hold for
sort order, for the newest marker, and for the day-old cutoff at the same time"):

- 01's *Re-saving does not restart its age reading* kills a `save` that rewrites the record it found.
- 02's *Re-saving an older name does not move the marker* kills the same defect seen through INV-29.
- 03's *Re-saving reorders nothing, under either view* kills it seen through the sort.
- 04's *Re-saving does not restart its 24-hour clock* kills it seen through the cutoff.

They pass by construction if INV-27 is built as specified (the already-saved branch returns the list
by reference), and that is the design's intent, not a missing test: **do not weaken `save` to
manufacture a red bar for them.**

### 5.2 Which invariants are live from which slice

Read as *"the slice that introduces it"* — **not** as an ordering claim. The order slices are built
in is stated in `issues/` and nowhere else (§5.5).

| Invariant | Introduced by | Note |
| --- | --- | --- |
| INV-27, INV-28, INV-32, INV-33, P21, P22, P25, P26 | issue 01 | The moment, its words, the row's stable name, and the tick — the whole "a moment exists and is shown honestly" concept arriving whole (ADR-0007). |
| INV-29 (both halves), P23 | issue 02 | The ordering rule arrives with its first consumer. |
| INV-30, P24, P27 | issue 03 | The view, its control, and the structural reason no rule can see it. |
| INV-31 | issue 04 | The cutoff, including its identity-on-no-op half, which is what keeps ticks silent. |
| INV-17..INV-26, P10..P20 | *(merged)* | Unchanged. INV-17's "no duplicates, at most five, nothing moves" is untouched: the display order is not the held order (INV-30). |

### 5.3 The non-DOM tests, named so they are not mistaken for drift

`src/visit.test.ts` is an inner-cycle file (ADR-0003) already home to the purity guard. This feature
adds **three** assertions there, and `src/clock.test.ts` is a **new** file with **one**. No spies, no
snapshots, no `renderHook`.

- **INV-32, boundaries** (issue 01) — `ageReadingText` at exactly `59_999`, `60_000`, `119_999`,
  `3_599_999`, `3_600_000`, and at a **negative** elapsed. The DOM proves the words a visitor reads;
  only a unit test can sit on the boundary without a 60-minute scenario per case, and the negative
  case is unreachable through the seam entirely.
- **INV-29, the tie** (issue 02) — two saved names sharing one `savedAt`: `newestSavedName` is the
  later insertion. Reachable through the DOM only by accident of fake-timer granularity, which is
  exactly why it is pinned deliberately here.
- **INV-31, identity on a no-op tick** (issue 04) — `expire(v, now) === v` by reference when nothing
  is old enough, **and** the revision unchanged. No scenario can see "nothing happened"; this is the
  domain half of "the passage of time is never announced".
- **`clock.test.ts`** (issue 01) — `clockTimeText` renders `14:20`, pads to `09:05`, and renders
  midnight as `00:00`. The format is fixed once by architecture because no acceptance criterion pins
  it (feature.md, *Out of scope*), so it needs one place that says what it is. `nowMs` is not tested:
  a test for it could only restate `Date.now()`.

Everything else about this feature is observable through the rendered DOM and belongs in a scenario.

### 5.4 Seam mechanics — measured, not assumed

Probed in this repo under `npm test -- --run` against a scratch component carrying the exact markup
shape P21–P27 prescribe (the probe was deleted; these are its results):

| Claim | Result |
| --- | --- |
| A full `vi.useFakeTimers()` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`. | **Hangs.** Every `await user.click(...)` times out at 5 s — 8/8 probe tests failed. Cause: `@testing-library/dom`'s `jestFakeTimersAreEnabled()` returns `false` unless the global `jest` exists, so RTL's async wrapper awaits a faked `setTimeout(0)` that never fires. `delay: null` does not help. |
| `vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })` with a plain `userEvent.setup()`. | **Works**, and is the recipe every slice uses. `vi.advanceTimersByTime` still moves `Date.now()` and still fires the interval. |
| `expect(li).toHaveAccessibleName('N0, saved at 14:20')` with `aria-label` on the `<li>`. | Confirmed. **Without the `aria-label` the accessible name is empty** — `listitem` takes no name from its contents — so issue 01's stable-time criterion is unreachable by any other markup that does not add an attribute (ADR-0040). |
| An `aria-hidden` age span is still found by `getByText` / `toHaveTextContent`, and `queryAllByRole('listitem')` still finds a labelled row. | Confirmed. The age reading is assertable through the seam while being invisible to the accessibility tree. |
| The reading counts up unprompted: save, then `act(() => vi.advanceTimersByTime(60_000))` twice, then 58 more minutes. | Confirmed — `saved 1 minute ago`, `saved 2 minutes ago`, `saved 1 hour ago`, while the row's accessible name stayed `…, saved at 14:20`. |
| Three names saved inside **one** fake instant (no clock advance between clicks). | Display stays `N0, N1, N2`; checking the box gives `N2, N1, N0`; the marker is on the last-saved. **This only holds with the reverse-then-descending-sort of INV-29** — a plain stable descending sort leaves all three tied in save order and issue 03's second scenario fails. |
| A row keeps its **DOM node** across a re-sort (`key={name}`). | Confirmed — the same `Remove N0` button object before and after the order flips, so focus inside a row survives a sort and a save. |
| Falling off: advance `DAY_MS - 60_000` ⇒ row present; a further `60_000 + TICK_MS` ⇒ row gone. | Confirmed. **A row is dropped at the first tick strictly after its 24 h mark**, so a scenario advancing exactly `86_400_000` still sees the row: advance past one further tick. |
| Focus during a fall-off. | Confirmed — a control outside the row keeps focus; nothing calls `focus()` on a tick (P19 unchanged). |
| Advancing a full 24 h against a 15 s interval. | **~5 ms.** 5 760 tick callbacks and their renders are not a cost worth designing around (N15). |

Two things this seam **cannot** see, unchanged from the merged features: whether a screen reader
actually speaks (or stays silent) for any of this — VH-02 — and whether a real browser reload clears
the visit (`greet-visitor` VH-02). Neither is manufactured into a test that would pass without being
true.

### 5.5 The queue

`issues/` owns the slice queue. **This design asserts no `Blocked by:` edge, restates none, and
contradicts none** [SD-07].

Each issue's acceptance steps were read against the capabilities available on the branch its own
`Blocked by:` line describes, looking for the `remembered-names` VH-01 failure — a step that must
*activate* a control the branch does not carry. **No such step exists in this feature**, so **no
defect is raised against the `po` node this round**: every control any scenario activates is either
merged already (`Save this name`, `Greet me again as <name>`, `Remove <name>`, the Name field) or is
introduced by the issue whose scenario activates it (the `Newest first` checkbox, in issue 03 only).
Time passing is not a control and needs nothing built.

---

## 6. Trade-offs, risks, and what is recorded where

### 6.1 ADR index (this feature)

| ADR | Decision |
| --- | --- |
| [0036](../../../docs/adr/0036-the-saved-at-moment-is-an-instant-handed-in.md) | The saved-at moment is **the instant**, handed to `save` by transport. Supersedes ADR-0034's stored clock reading; the purity guard is not edited and no clock port is introduced. |
| [0037](../../../docs/adr/0037-the-age-reading-stays-in-the-domain-the-wall-clock-does-not.md) | The **age reading stays in the pure module** (an elapsed span is timezone-free); the **stable absolute time** moves to `src/clock.ts`, the one module allowed a calendar. |
| [0038](../../../docs/adr/0038-one-ordering-rule-for-the-marker-and-the-sort-view.md) | **One ordering rule** — latest moment first, ties to the later insertion — owns both the newest marker and the newest-first view; the sort flag is screen state, so no rule can read a sorted list. |
| [0039](../../../docs/adr/0039-falling-off-is-a-command-driven-by-the-tick.md) | **Falling off is a domain command** (`expire(visit, now)`) driven by the tick and written through `withSavedNames`; it returns identity when nothing expired, which is what keeps the passage of time silent. |
| [0040](../../../docs/adr/0040-the-row-carries-the-stable-time-as-its-accessible-name.md) | The row's **`aria-label`** carries the stable absolute time and the age reading is **`aria-hidden`**; that pairing is what makes "time is never announced" and "a stable time in its place" one mechanism. |
| [0041](../../../docs/adr/0041-saved-at-acceptance-seam-and-slice-shape.md) | One acceptance seam for all four slices, with fake timers narrowed to `setInterval`/`clearInterval`/`Date`; all four red-first; no new component (the extraction tripwire is re-run and sharpened); the queue stays in `issues/`. |

### 6.2 Known risks, stated rather than mitigated away

1. **The tick is the only thing in this app that acts on its own.** If the effect's cleanup is
   dropped, a remount leaks an interval; if the reading moves inside the updater, StrictMode can
   produce two moments for one press (P25, P26). Both are one-line mistakes with no failing test in
   jsdom, so both are written as invariants with a named owner rather than left to review.
2. **A live region that contains changing text.** `aria-hidden` is doing load-bearing accessibility
   work, and jsdom cannot verify it. VH-02.
3. **The sort control sits inside the live region** (the mockup's placement), so flipping it changes
   the region's contents and a screen reader may re-announce the list. Arguably right — the visitor
   asked for the change — but it is verbosity nobody has heard yet. VH-03.
4. **A refusal is cleared by a fall-off.** `expire` goes through `withSavedNames(…, null)` like every
   other list write, so a standing `Five names is the limit.` disappears when a stale row leaves.
   That is INV-20 working correctly (the refusal described a list state that no longer holds), and it
   is only reachable after 24 h, but it is a message vanishing without the visitor acting. VH-05.
5. **`GreetingScreen.tsx` grows to roughly 165 lines of JSX and four pieces of state.** The
   extraction tripwire fired and was answered rather than ignored (ADR-0041); the next feature that
   adds screen state should extract instead of arguing again.
6. **Two known couplings** (§2.5): the tick period against the 60-second rule, and the seam's
   `toFake` list against P25's choice of `setInterval`.
7. **The day-old cutoff is nearly unreachable in practice** — the seed says so plainly, since a visit
   dies at unmount. It is built as specified and proven under a controlled clock; nobody should
   expect to see it in a real browser.

### 6.3 Human checks this design does not close

Recorded in `.sdlc2/features/saved-at/VERIFY-WITH-HUMAN.md`: **VH-01** (the stable time's format and
the row label's wording), **VH-02** (the screen-reader pass over a ticking row — continuing the open
`saved-name`/`remembered-names` screen-reader checks), **VH-03** (the sort control inside the live
region), **VH-04** (the sort preference surviving an emptied list), **VH-05** (a refusal cleared by a
fall-off).
