# Design — Undo a removal (`undo-a-removal`)

> Input: `.sdlc2/features/undo-a-removal/feature.md` (seed + product brief), `issues/01..03`,
> `mockup.html`. Existing merged code: `src/visit.ts`, `src/clock.ts`, `src/GreetingScreen.tsx`,
> `src/App.tsx`, `src/visit.test.ts`, `src/GreetingScreen.test.tsx`, and the merged ADRs
> `docs/adr/0001`–`0009`, `0019`–`0043`. Output consumed by the `developer` node.
>
> This document designs the **domain model, the boundaries, the contracts, and the outer
> acceptance-test seam for each of the three slices**. It changes no acceptance criterion, no issue,
> no line of `feature.md` and no line of `mockup.html`.
>
> **The slice queue is not stated here.** The `Blocked by:` lines in `issues/` are the only place it
> lives and the only thing the build engine reads. This design declares no edge, restates no edge,
> and contradicts no edge (§5.5) [SD-07].
>
> **The seed is settled work.** Every decision in `feature.md` — the entry comes back whole
> (ADR-0042), the offer ends rather than refuses (ADR-0043), only a pressed removal is undoable, the
> offer stands rather than counting down, the memory belongs to the visit, the exclusions, and the
> po's ruling that a *refused* save does not end the offer — is carried forward verbatim and is not
> re-derived. This design spends itself on what the seed left to architecture: **what the visit
> holds, who may write it, where the ageing rule lives, and what each slice is driven through.**
>
> **Numbering.** ADRs continue at **0044** (`0001`–`0009` and `0019`–`0043` are merged; `0010`–`0018`
> are claimed on the unmerged `slice/greeting-log/*` branches). Rules continue at **R38**, invariants
> at **INV-34**, presentation invariants at **P28**, non-functionals at **N18** — an id means one
> thing across this repo.

---

## 1. Problem understanding

### 1.1 What already exists (and is not redesigned here)

`greet-visitor`, `saved-name`, `remembered-names` and `saved-at` are merged. One aggregate (`Visit`)
lives in the pure module `src/visit.ts`; one driving adapter (`src/GreetingScreen.tsx`) renders it;
one transport module (`src/clock.ts`) holds the impurity the domain refuses.

The parts this feature actually leans on:

- `Visit.savedNames: readonly SavedName[]` — at most five, no duplicates, **save order**, each entry
  `{ name, savedAt }` with identity on `name` alone (ADR-0035, INV-27, INV-28).
- **One private writer of the list fields**, `withSavedNames(visit, savedNames, refusal)`, which
  takes the new list and the new refusal *in one call* so the two can never disagree (ADR-0027), and
  bumps `savedNamesRevision` on every call — including a refusal, so the polite region speaks again
  (ADR-0030, INV-21).
- Commands `save(visit, savedAt)`, `remove(visit, name)`, `greetAgain(visit, name)`,
  `expire(visit, now)`, and the greeting transition `submit(visit, raw)` whose non-blank branch is an
  **exhaustive literal** carrying the list fields, so forgetting one is a compile error (INV-23).
- `expire` drops every entry older than a day and **returns the visit by identity when it drops
  nothing**, which is what keeps the passage of time silent (INV-31, ADR-0039).
- Projections `savedNamesInView(visit, newestFirst)` and `newestSavedName(visit)`, both reading one
  private ordering rule; the sort preference is **screen state and never reaches the domain**
  (INV-29, INV-30, ADR-0038).
- Presentation: the Saved names region is a polite live `<section>` focusable at `tabIndex={-1}`;
  **removing moves focus to the region** because it destroys the control that was pressed (P19); rows
  are keyed by name; each row carries a stable `aria-label` and an `aria-hidden` age reading
  (ADR-0040).
- `src/visit.ts` **may not mention `Date`**, enforced by a lexical guard in `src/visit.test.ts`
  (ADR-0008, INV-33). *A guard amended to let a feature through is not a guard.* **It is not edited
  by this feature**, and nothing here needs it to be: the offer's one time-dependent rule takes the
  instant as an argument, exactly as `save` and `expire` already do (ADR-0036).

Two merged ADRs were written **before** this graph ran, in the pre-run grilling, and are inputs
rather than outputs: **ADR-0042** (the entry comes back whole — same text, same moment, same place)
and **ADR-0043** (the offer ends when the list moves; it never refuses). This design realises them;
it does not re-argue them, and no ADR below reopens either.

### 1.2 Functional requirements, restated as rules

| ID | Rule | Source |
| --- | --- | --- |
| R38 | A **removal the visitor performs** leaves an offer to bring that name back. A name that **falls off** leaves nothing — the visitor activated nothing, so nothing was taken from them by mistake. | seed, Agreed scope + Decisions |
| R39 | **At most one name is ever waiting to come back.** Each removal replaces the offer left by the one before it. No history, no stack, and never beyond the visit. | seed, Agreed scope |
| R40 | **Bringing back restores the entry whole**: the same text, the same saved-at moment, the same place in the list. The list afterwards reads exactly as it did before the removal — same order, same age readings, same `Newest` marker. It is **a write to the list**, so it is announced like every other write and clears a standing refusal like every other write; it **moves focus to the Saved names region**; and it leaves **the greeting untouched**. | seed, Agreed scope + ADR-0042 |
| R41 | **The offer ends when the list moves, and never refuses.** Another removal replaces it; a **successful** save or a **fall-off** ends it. A **refused** save (`already-saved` or `full`), a sort toggle, greeting again, a blank submission and typing all leave it standing. It **does not time out**. Once pressed it is spent. | seed, Agreed scope + ADR-0043 + po Decisions |
| R42 | **The held entry ages like the rest.** Once its own saved-at moment is more than a day old the offer is gone — **silently**: no message, nothing announced. A name brought back keeps ageing from its original moment. | seed, Agreed scope + issue 03 |
| R43 | The offer is **one named control inside the Saved names region, between the heading and the rows** — after a standing refusal, above the sort control — reading **`Bring <name> back`**. It is shown **alongside the empty state** when the last name was removed, and the sort control stays absent there. | seed, Agreed scope + mockup |
| R44 | Everything else is unchanged: the five-name limit, both save refusals, greeting again, removing, the newest-first sort, the `Newest` marker, the day-old fall-off, and the Name field's hint — in which a name brought back reappears, in its own place. | seed, Agreed scope |

### 1.3 Non-functional / cross-cutting

| ID | Concern | Position |
| --- | --- | --- |
| N18 | **The offer's silence when it ends.** Its ending is a *node removed* from a polite live region. `aria-relevant` defaults to `additions text`, so removals are not announced — that is the mechanism behind "nothing is said" (R42), and it is the same mechanism that already keeps the Save button and the sort control silent when they disappear. jsdom implements no announcement, so the honouring half is a human check (VH-02). | P28, VH-02 |
| N19 | **The merged VH-02 constraint test gains a stated exception.** *"leaves nothing an assistive technology can perceive changed by a tick"* is still true and still passes, because it never leaves an offer standing. It is **not** a claim that a tick can never change the region: from the slice that adds R42, a tick may remove the offer. Nobody should "strengthen" that test by leaving an offer standing, and nobody should read its survival as proof R42 is silent. | §4.4, VH-02 |
| N20 | **Staleness is the tick's, and unchanged.** The offer may survive up to one tick period (15 s) past its cutoff, exactly as a row may (N17). The control and the command read the *same* reading of the clock, so the offer can never be visible and inert in the same render (P29). | ADR-0047 |
| N21 | **Cost.** One nullable field on the visit: a reference to a `SavedName` object that already exists plus a small integer. No copy of the list is kept, no timer is added, and no render path gains a scan — the offer is one `?.` deep. | §2.3 |
| N22 | **Determinism of the domain is unchanged.** `bringBack` and the offer's projection are total pure functions of their arguments. No clock port, no mock, no spy; `src/visit.ts` still imports nothing. | ADR-0046 |

### 1.4 Explicit non-goals (from the seed, restated so the design can be checked against them)

No **redo** — a spent offer does not come back, and nothing undoes an undo. No **keyboard shortcut**
and no global key handler; the offer is an ordinary named button. No undoing a **save**, a
**greeting** or a **blank submission**. No undoing a **fall-off**. No **persistence** — a visit still
dies at unmount, nothing is written to web storage, and no offer survives a reload. **No message
about the offer ending.** No **countdown** and no second thing on the clock's tick. No change to what
a saved name is, to the limit, or to either refusal.

---

## 2. Domain model

### 2.1 Bounded context

**Still one context: `Greeting`.** Nothing here creates a second one, and — this is the load-bearing
part — **nothing here creates a second aggregate.** The offer is not an entity with a life of its
own; it is a fact about this visit's list, and the seed says so plainly: *"The memory belongs to the
visit, not to the screen… It is a field of the visit like the saved names themselves, written by
whatever already owns writes to the list, so the offer and the list can never disagree."*

The consequence for boundaries: **a removal writes the list and records the offer in one
transaction, on one aggregate.** There is no operation in this feature that spans two aggregates, and
no eventual consistency to reason about, because the only two things that must agree — the list and
the offer — are two fields behind one private writer (INV-34). There is still **no driven port, no
repository, no storage and no network** (ADR-0006 stands), and still **no domain event bus**: the one
thing downstream of a list write, the polite region speaking, is already carried by
`savedNamesRevision`.

### 2.2 Ubiquitous language → code names

Every term is the seed's or the po's; none is coined here.

| Term (seed / po) | Meaning | In code |
| --- | --- | --- |
| **Removal** | A saved name leaving the list because the visitor asked for it. | `remove(visit, name)` |
| **Falls off** | The same disappearance, no visitor, and **not undoable**. | `expire(visit, now)` |
| **Last removal** | The one removal a visit is still offering to take back. At most one per visit. Remembers the saved name that left — text and saved-at moment — and the place it held. | `type LastRemoval`, field `visit.lastRemoval` |
| **The held entry** (po) | What the last removal remembers: the removed saved name, its own moment, and the position it held. | `LastRemoval.entry` (a `SavedName`) + `LastRemoval.position` |
| **Bringing back** | Putting the last removal's saved name into the list again: same text, same moment, same place. A write to the list, **never a new save**. | `bringBack(visit, now)` |
| **The offer** | What the screen shows while there is a last removal: the single control that brings the name back. | `offeredName(visit, now)` → the name, or `null` |
| **The offer stands** | There is a last removal and its entry has not aged past the day-old cutoff. | private `stands(held, now)` |

Two naming notes. `bringBack` is deliberately **not** `undo`: *undo* invites a stack and a redo, both
excluded (seed, *Out of scope*), while *bringing back* is the seed's own verb for exactly one thing.
`offeredName` returns **a name, not a sentence** — the same shape as `newestSavedName` — because the
control's words are the component's (§2.5).

### 2.3 The aggregate

```ts
/** The one removal this visit is still offering to take back (seed, Ubiquitous language). */
export type LastRemoval = {
  /** The saved name that left, with the moment it already had — never a fresh one (ADR-0042). */
  readonly entry: SavedName
  /** The index it held in visit.savedNames — the held order, never the displayed one (INV-30). */
  readonly position: number
}

export type Visit = {
  // …the seven merged fields, unchanged…
  /** The offer, or null when there is nothing waiting to come back. One field, so "at most one,
   *  no history, no stack" (R39) is unrepresentable-otherwise rather than a rule anyone enforces. */
  readonly lastRemoval: LastRemoval | null
}
```

`newVisit` gains `lastRemoval: null`. Because the visit is component-local state that dies at unmount
(INV-24), "only within the same visit" (seed) needs no rule of its own — it is where the field lives.

**Why `entry` and `position`, and not the alternatives.** The seed defines a last removal as *the
saved name that left — text and saved-at moment — and the place it held*, so this shape is carried
forward, not chosen. The two near misses are recorded in ADR-0045: remembering **only the name**
(which is ADR-0042's rejected re-save, arriving by the back door) and remembering **a snapshot of the
whole list** (which would silently roll back any write that slipped past R41, hiding a broken rule
instead of showing it).

**Why the position is an index into the held list and never the displayed one.** The domain cannot
see the view (INV-30), so `remove` records `findIndex` into `visit.savedNames`. That is not a
limitation to work around: the newest-first view is a pure function of the list, so restoring the
list restores the view. Remove a row while `Newest first` is checked, bring it back, and it reappears
exactly where that view puts it — no criterion pins this, and none needs to; it follows.

### 2.4 Invariants and their owners

Every invariant names **exactly one enforcement point** — one function a reader can open. INV-1 to
INV-33 and P1 to P27 are unchanged except where an amendment is stated.

| ID | Invariant | Single owner | How it is enforced there |
| --- | --- | --- | --- |
| INV-34 | **`lastRemoval` has exactly one writer, and every write to the list states the offer's fate in the same call.** There is no path that changes the list without answering "and what happens to the offer?", and no path that changes the offer while the list stands still. | `withSavedNames(visit, savedNames, refusal, lastRemoval)` in `src/visit.ts` (module-private) | The fourth parameter is **required**, so a list write that forgets the offer is a compile error rather than a bug found by a visitor (the same device ADR-0027 used for the refusal). The six call sites and their answers are tabulated in §4.1. `submit` does not call it and carries the field through its exhaustive literal (INV-23, amended below). The field's type is `LastRemoval \| null`, so a stack (R39) is unrepresentable rather than forbidden. |
| INV-35 | **A removal records exactly the entry it deleted and the index it deleted it from.** | `remove(visit, name)` in `src/visit.ts` | One `findIndex` result builds *both* the shortened list (`[...before(position), ...after(position)]`) and the record `{ entry, position }`, so the two cannot describe different rows. `holds` has already guaranteed the name is present, so the index is never `-1`. |
| INV-36 | **Bringing back reinserts that entry at that index and changes nothing else about the list**: no re-dating, no re-ordering, no second copy. | `bringBack(visit, now)` in `src/visit.ts` | `[...savedNames.slice(0, position), entry, ...savedNames.slice(position)]` — the literal inverse of INV-35's deletion, on the list that deletion produced. `entry` is the object `remove` captured, so the moment is not re-derived and *cannot* be: `bringBack` constructs no `SavedName` (INV-27 keeps its single constructor, `save`). The greeting fields are not among the four `withSavedNames` writes, so "the greeting is untouched" needs no rule of its own. |
| INV-37 | **One day-old cutoff, in one expression**, read by the rule about rows and the rule about the offer. | private `hasAged(savedAt, now)` in `src/visit.ts` — `now - savedAt > DAY_MS` | `expire` keeps `!hasAged(...)`; `stands` requires `!hasAged(...)`. *Older than* a day, not *at least*: an entry exactly `DAY_MS` old stays, for rows and for the offer alike. This is INV-31's comparison **moved**, not copied — INV-31 is unchanged in substance and still owned by `expire`; extracting it is what stops the offer growing a second cutoff beside it. |
| INV-38 | **The offer stands iff there is a last removal whose entry has not aged.** The control's existence and the command's willingness to act are **one answer**, not two. | private `stands(held, now): held is LastRemoval` in `src/visit.ts` | `held !== null && !hasAged(held.entry.savedAt, now)` — one predicate, read by `offeredName` (whether the screen shows a control) and by `bringBack` (whether the command does anything), exactly as `holds` is read by `save`, `remove` and `greetAgain`. A TypeScript type predicate, so the null-check narrows and no caller re-tests it. |

**Amendments to merged invariants** (same owners, wider statements):

- **INV-23** — `submit`'s non-blank branch is an exhaustive literal over **four** list fields now,
  `lastRemoval` included. That is the whole of "greeting, and greeting again, leave the offer
  standing" (R41): forgetting to carry it does not lose an offer at runtime, it fails the build.
- **INV-31** — unchanged in substance. Its comparison lives in `hasAged` (INV-37); `expire` still
  owns *which rows there are*, still writes through `withSavedNames`, and still returns the visit by
  identity when it drops nothing.
- **INV-21** — unchanged. `bringBack` bumps `savedNamesRevision` because it is a list write, which is
  the whole of "it is announced the way every write to the list already is" (R40).

**A theorem, not an invariant: the five-name limit is inherited on this path, not re-checked.**
`bringBack` performs no count and INV-17 keeps `save` as its only enforcer. The reason it holds
anyway is a chain of the invariants above, and it is worth reading once: an offer exists only because
`remove` created it (INV-34/35), and any later write to the list would have replaced it with `null`
(INV-34, §4.1's table), so the list `bringBack` is handed is *exactly* the list `remove` produced,
and reinserting at the recorded index (INV-36) reproduces the list value that satisfied INV-17
immediately before the removal. Same length, same members, same order. The limit is therefore not
re-enforced by a second owner — it is **inherited by identity of the value**. ADR-0045 records why
that is preferred to a check, what a check would have cost, and how the chain is pinned by tests
rather than trusted (§5.3, plus issue 01's own five-name scenario at the seam).

**What is deliberately *not* an invariant.** There is no rule that the offer is cleared when the
visit's greeting changes — the greeting is not the list. There is no rule that `position` is in
range: it is by the theorem above, and if it somehow were not, `slice` clamps, so the worst
imaginable failure is an append rather than a crash. There is no runtime assertion that "the list
has not moved" — that is what the single writer makes true, and an assertion would be a second,
weaker copy of it.

### 2.5 Where visitor-facing text lives

Unchanged, and this feature adds nothing to the domain's vocabulary: the **domain owns messages**
(the alert, the empty state, both refusals, the age reading), the **component owns element shape and
control names** (`Save this name`, `Greet me again as <name>`, `Remove <name>`).

**`Bring <name> back` is a control name, so it is the component's** — beside its two siblings on the
row, not split off into the domain because it happens to be new. The domain supplies the *name*
(`offeredName`), never the sentence, exactly as `newestSavedName` supplies a name and the component
writes `Newest`. The rejected alternative — a domain projection `offerText(visit, now): string | null`
returning `"Bring Ada back"` — would put the third of three control names in a different file from
the other two, splitting the codebase by feature instead of by kind, and would make ADR-0003's
promise (*read `visit.ts` to know what the screen says*) truer by one sentence at the cost of making
"where do control names live?" unanswerable. Recorded in ADR-0047.

**One known coupling, stated rather than engineered away:** the offer's words and the row's
`Remove <name>` must keep naming the same name for the same row. Nothing enforces it; both
interpolate the one `name` value, and issue 01's scenarios read both.

---

## 3. Architecture

Unchanged in shape: a **modular monolith of one context**, a pure domain module, one driving adapter,
one transport module for the clock. **No new module, no new component, no new dependency**; nothing
is added to `package.json`.

```
                       ┌────────────────────────────────────────────────────────┐
  visitor ── DOM ────► │  Driving adapter:  src/GreetingScreen.tsx               │
  (RTL + user-event)   │  • useState<string>  rawName        (draft, INV-6c)     │
                       │  • useState<Visit>   visit          (INV-6a, INV-24)    │
                       │  • useState<number>  now            (P25)               │
                       │  • useState<boolean> newestFirst    (P27)               │
                       │  • useRef<HTMLElement> savedNamesRegion (P19 ×2)  NEW   │
                       │  • the offer's element + handler    (P28, P29)    NEW   │
                       │  • NO new screen state — the offer is domain state      │
                       └──────┬──────────────────────────────────────┬───────────┘
                              │ commands + projections               │ nowMs() · clockTimeText()
                              │ (plain calls, no port object)        │ TICK_MS
            ┌─────────────────▼───────────────────────┐  ┌───────────▼────────────────────────┐
            │  Domain:  src/visit.ts                  │  │  src/clock.ts        (impure)      │
            │  pure · total · synchronous             │  │  unchanged by this feature         │
            │  Visit aggregate — ONE boundary         │  └────────────────────────────────────┘
            │    submit · save · remove · greetAgain  │
            │    expire · bringBack            NEW    │     Direction of dependency:
            │    withSavedNames(…, lastRemoval) ⇽ the │     component → clock,  component → visit
            │      ONE writer of the list AND the     │     clock ↮ visit  (they never meet)
            │      offer (INV-34)                     │
            │    holds · byNewestFirst                │     Driven side: still none. No repository,
            │    hasAged · stands              NEW    │     no storage, no network, no clock port,
            │    …projections… · offeredName   NEW    │     no event bus.
            │  imports nothing · no browser global    │
            │  (INV-6b/INV-33, guarded — ADR-0008)    │
            └─────────────────────────────────────────┘
```

**Data flow of one removal** (the offer is created inside the same transition that shortens the list):

```
click "Remove Ada"
  └─ setVisit(v => remove(v, 'Ada'))
  │     └─ position = indexOf(Ada)  →  withSavedNames(v, listWithoutAda, null, {entry: Ada, position})
  │            └─ revision +1 · refusal cleared · offer recorded   ── one value, one transaction
  └─ savedNamesRegion.current?.focus()          (P19 — unchanged)
```

**Data flow of one bring-back** (the mirror image, and the second member of P19):

```
click "Bring Ada back"
  └─ setVisit(v => bringBack(v, now))        ← `now` is the render's reading, not a fresh one (P29)
  │     └─ stands(v.lastRemoval, now) ? withSavedNames(v, listWithAdaBackAtHerIndex, null, null)
  │                                     : v            (by identity — nothing to do, no event)
  └─ savedNamesRegion.current?.focus()
```

**Data flow of one tick** (unchanged in mechanism; the offer joins the derived half):

```
setInterval fires
  └─ n = nowMs()
     ├─ setNow(n) ──► re-render ──► ageReadingText(savedAt, n)   per row   (aria-hidden: silent)
     │                          └─► offeredName(visit, n)  ⇽ NEW: the offer disappears here when the
     │                                                        held entry ages — no state changed, so
     │                                                        no revision, no refusal cleared (R42)
     └─ setVisit(v => expire(v, n))
            ├─ nothing older than a day → returns v BY IDENTITY → React bails out
            └─ something is → withSavedNames(kept, null, null) → offer ends too (R41), revision +1
```

That third arrow is the shape of this feature's one genuinely new idea: **the offer's *availability*
is derived on render, while the offer's *existence* is state.** ADR-0046 records why, and what
storing the ageing instead would have cost.

---

## 4. Contracts

### 4.1 Domain module — `src/visit.ts`

Additions and changes only; every other export keeps its current signature and behaviour.

```ts
/** The one removal this visit is still offering to take back (seed, Ubiquitous language). */
export type LastRemoval = { readonly entry: SavedName; readonly position: number }

/** Visit gains one field; newVisit gains `lastRemoval: null`. */
readonly lastRemoval: LastRemoval | null

/** INV-34. Private. Now four arguments: a list write states the offer's fate in the same call. */
function withSavedNames(
  visit: Visit,
  savedNames: readonly SavedName[],
  refusal: SaveRefusal | null,
  lastRemoval: LastRemoval | null,
): Visit

/** INV-37. Private. The one day-old cutoff — read by expire (rows) and stands (the offer). */
function hasAged(savedAt: number, now: number): boolean

/** INV-38. Private. Whether the offer stands — one answer for the control and for the command. */
function stands(held: LastRemoval | null, now: number): held is LastRemoval

/** INV-35. Unchanged signature; now also records the entry it deleted and the index it held. */
export function remove(visit: Visit, name: string): Visit

/** INV-36. Puts the held entry back where it was. Total: returns the visit by identity when the
 *  offer does not stand, so it is never a refusal and never a message (ADR-0043). */
export function bringBack(visit: Visit, now: number): Visit

/** R43. The name the offer would bring back, or null when there is no offer. A name, never a
 *  sentence — the control's words are the component's (§2.5). */
export function offeredName(visit: Visit, now: number): string | null
```

The signatures above are this feature's **finished** shape. `bringBack` and `offeredName` take no
`now` until the slice that adds the day-old rule for the offer — the same widening `save(visit)` →
`save(visit, savedAt)` already went through in `saved-at`, and for the same reason: an argument
arrives with the rule that needs it, not before (§5.2). Both are new here, so no merged caller moves.

**Every call site of `withSavedNames`, and the answer it gives** — this table *is* INV-34, and a
reader checking the design against the code should check exactly these six rows:

| Caller / branch | list argument | `lastRemoval` argument | Why |
| --- | --- | --- | --- |
| `save` — appends | `[...savedNames, { name, savedAt }]` | **`null`** | A successful save moves the list, so the offer ends (R41). |
| `save` — `already-saved` | `visit.savedNames` *(by reference)* | **`visit.lastRemoval`** | A refusal adds, moves and removes nothing; the restore it promises is as valid after it as before (po Decisions). |
| `save` — `full` | `visit.savedNames` *(by reference)* | **`visit.lastRemoval`** | Same. And a `full` refusal cannot coexist with an offer anyway — reaching five again needs a successful save, which ends it (po Decisions). Written for the rule, not for the reachable case. |
| `remove` | list minus the entry | **`{ entry, position }`** | The removal *is* the offer (R38). Assigning rather than pushing is the whole of "each removal replaces the one before it" (R39). |
| `expire` — dropped something | `kept` | **`null`** | A fall-off is a write to the list (ADR-0039), so it ends the offer — even a fall-off of some *other* name (R41). |
| `bringBack` | list with the entry back at its index | **`null`** | The offer is spent; there is no redo (seed, *Out of scope*). |

Two paths deliberately **do not** call it: `submit` (both branches) carries `lastRemoval` through —
by spread on the blank branch, by exhaustive literal on the non-blank one (INV-23) — and `expire`
returns the visit **by identity** when nothing aged, so an ordinary tick is not a write and cannot
disturb an offer (R41's "does not time out"). `greetAgain` delegates to `submit` and inherits both.

### 4.2 Transport module — `src/clock.ts`

**Unchanged.** No new export, no new period, no second timer. The offer is driven by the tick that
already exists, and only through the reading it already publishes (`now`).

### 4.3 Component contract — `src/GreetingScreen.tsx`

**No new state.** This is the first feature since ADR-0041 sharpened the extraction tripwire that
adds none: the offer is domain state and its availability is derived, so the component gains one
derived value, one handler and one element. The tripwire (*extract `SavedNamesRegion` when a second
screen renders it, or when it owns state that is genuinely about the region*) is therefore **not
tripped**, and the argument is not re-run (ADR-0048).

```tsx
// beside `refusal` and `newest`
const offered = offeredName(visit, now)

// beside removeSavedName — the second member of P19, and its mirror image
const bringTheNameBack = () => {
  setVisit((current) => bringBack(current, now))
  savedNamesRegion.current?.focus()
}
```

Region markup, top to bottom (the mockup's order): `<h2>Saved names</h2>` · the refusal `<p>` when
there is one (P14) · **the offer `<p><button>` when one stands (P28)** · the `Newest first` checkbox
when anything is saved (P24) · the empty state **or** the `<ul>` of rows (P15) · the save control when
there has been a greeting (P17). Row contents are unchanged.

| ID | Presentation invariant | Enforced by |
| --- | --- | --- |
| P28 | The offer is rendered **iff** `offeredName(visit, now) !== null`, as `<p><button type="button" onClick={bringTheNameBack}>Bring {offered} back</button></p>`, inside the region, **after** the refusal and **before** the sort control — the band where a refusal already sits (R43). Never disabled, never rendered with a placeholder name, and its absence is never a message (R42, and P17's rule applied a third time). | One `{offered !== null && …}`. It sits **outside** the `savedNames.length === 0 ? … : …` branch, which is the whole of "removing the last name shows the empty state *and* the offer" — one element in one place, not two. Because there is only ever one offer, it needs no `key`: a *different* name changes the button's text (announced as `text`), and a *returning* offer is a fresh node (announced as an `addition`). |
| P29 | The offer's handler is the removal handler's mirror: it replaces the visit and then calls `savedNamesRegion.current?.focus()`. It passes **the `now` this render already used**, never a fresh `nowMs()`. | Two lines, matching `removeSavedName` line for line — one rule for the screen, not two (seed, Decisions). Passing the render's `now` is what makes ADR-0043's *"present and certain to work"* literally true: the control exists because `stands(held, now)` was true, and the command tests the same number, so a visible offer can never be inert. A second, later reading could disagree with the render that drew the button, which is a button doing nothing — the exact failure the seed rules out. It is not a clock read inside an updater, so P26 is untouched. |

**Two behaviours no criterion fixes**, stated so they are not discovered as surprises: removing a row
while `Newest first` is checked and then bringing it back returns the row to the place that view puts
it (a consequence of INV-30 — the view is a pure function of the list); and an offer left standing
while the visitor keeps typing survives, because typing writes only the draft.

### 4.4 What this feature changes in the merged suite

**It edits no merged test.** That is worth checking rather than assuming, and it was:

| Merged test (file) | Fate | Why |
| --- | --- | --- |
| `visit.test.ts` — every call site | **untouched** | `withSavedNames` is module-private, so its new parameter is invisible outside the file. `save`, `remove`, `expire`, `submit` and `greetAgain` keep their signatures; only the brand-new `bringBack` and `offeredName` take `now`, and their only callers are this feature's own. |
| `visit.test.ts` — the INV-6b purity guard | **must stay green, unedited** | Nothing here mentions `Date`. If it goes red, the fix is in `visit.ts`, never in the guard (ADR-0008). |
| `GreetingScreen.test.tsx` — every region and row assertion | **expected to keep passing as written** | Read, not assumed: row assertions use substring `toHaveTextContent` or scoped `within(row)` queries, and region assertions name a role and an accessible name. A `<p>` appearing between the heading and the sort control adds no row, no listitem and no button inside a row. |
| `GreetingScreen.test.tsx` — *"leaves nothing an assistive technology can perceive changed by a tick"* (VH-02 constraint test) | **keep, unedited** | It never leaves an offer standing, so it stays true. N19 states the exception explicitly so nobody mistakes it for a proof that a tick can never change the region, and nobody "improves" it by adding a removal before the tick. |
| `GreetingScreen.test.tsx` — *"never writes to web storage"* (constraint test) | **keep** | Unchanged. Bringing a name back writes nothing; no Gherkin step is added for it. |

---

## 5. The seam — per slice

**Seam family (all three slices):** the project's declared frontend seam — **React Testing Library +
user-event via Vitest (jsdom)** — driving the rendered DOM by role and accessible name. All **23**
acceptance scenarios are driven through it. No slice introduces a different kind of acceptance test,
and none needs a backend seam (`seam.backend: ""`). Run with `npm test -- --run`; typecheck with
`npm run build`.

**One entry point for the whole feature: `render(<GreetingScreen />)`**, in
`src/GreetingScreen.test.tsx`. `src/App.test.tsx` gains **no** `it` — no acceptance criterion here
mentions the app shell, and ADR-0005's tripwire says a second `it` there is the signal the suite has
begun duplicating itself.

**The time control (carried unchanged from ADR-0041 — do not improvise it):** every slice puts its
scenarios in one `describe` whose `beforeEach` is

```ts
vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })   // afterEach: vi.useRealTimers()
// advance with the merged helper:  await timePasses(10 * 60_000)
```

`setTimeout` stays real, because React Testing Library's fake-timer detection only recognises *jest*
and a full `vi.useFakeTimers()` makes every `await user.click(...)` in the file hang (ADR-0041,
measured). Two merged helpers do the rest: `timePasses(ms)` and `expectAgeReading(name, reading)`. One
consequence of a stopped clock is load-bearing here and must not be "fixed": consecutive saves share
one instant, and the merged tie-break (INV-29) makes the **later** save the newest — which is exactly
what issue 01's `Newest` marker scenario assumes.

| Slice | Issue | Kind | Outer seam (file · entry point · the queries and controls it turns on) | Scenarios | Production change |
| --- | --- | --- | --- | --- | --- |
| 01 | `01-bring-back-the-last-removed-name` | **red-first** | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` · `queryByRole('button', { name: 'Bring Ada back' })` for absence and `getByRole(...)` for presence · `within(region).getByRole('button', …)` for "in the Saved names region" · `offer.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING` for "before the row for Ada" (the merged status-before-region assertion is the precedent) · the merged `expectAgeReading('Ada', 'saved 10 minutes ago')` · `rowsInTheSavedNamesRegion()` index order · `within(row).getByText('Newest')` and `queryByText` for its absence · `expect(getByRole('region', { name: 'Saved names' })).toHaveFocus()` · `toHaveAccessibleDescription('Saved: Ada, Bob')` · `getByRole('status')` for the untouched greeting · `getByText('No names saved yet.')` + `queryByRole('checkbox', { name: 'Newest first' })` · `queryByText(FULL_LIST_MESSAGE)` for the five-name case · `timePasses` for the fall-off | **12** | `visit.ts`: `LastRemoval`, the `lastRemoval` field on `Visit` and `newVisit`, the fourth parameter on `withSavedNames` **and all six answers in §4.1's table**, `remove` recording the entry and index, `bringBack(visit)`, `offeredName(visit)`, and `submit`'s literal carrying the field (INV-34, INV-35, INV-36, INV-23). `GreetingScreen.tsx`: `offered`, the handler, the element (P28, P29). Plus the two named unit assertions (§5.3) |
| 02 | `02-the-offer-ends-when-the-list-moves` | **guard slice** (§5.1) | same file · same entry point · `timePasses(10 * 60_000)` for "does not time out" · the merged `Remove <name>`, `Save this name`, `Greet me again as <name>` and `Newest first` controls · `getByRole('status')` for the greeting the save reads · `getByText('Ada is already saved.')` then `queryByText(...)` for the refusal cleared · `rowsInTheSavedNamesRegion()` for "a row for Bob only" and for the restored order · a blank submit through the merged `Greet me` button | **7** | **None.** The lifecycle cannot arrive in halves (§5.1) |
| 03 | `03-the-held-entry-ages-like-the-rest` | **red-first** | same file · same entry point · `timePasses(4 * 60_000)` / `timePasses(6 * 60_000)` after a `timePasses(23 * 3_600_000 + 55 * 60_000)` setup · `queryByRole('button', { name: 'Bring Ada back' })` **and** `queryByText('Bring Ada back')` together, for "no button" *and* "no text anywhere on screen" · `rowsInTheSavedNamesRegion()` for the restored row still ageing out, and for Bob's row surviving | **4** | `visit.ts`: `hasAged` (INV-31's comparison extracted), `stands`, and the `now` argument reaching `bringBack` and `offeredName` (INV-37, INV-38). `GreetingScreen.tsx`: two call sites gain `now`. Plus one named unit assertion (§5.3) |

Every slice is one sitting: one test file, at most two production files, each compiling and passing
on its own under `strict` + `noUnusedLocals`. **Each slice is end-to-end** — it changes the aggregate,
the render, and what a visitor perceives, and is proven through the one seam above. None can be built
as "domain only" and left invisible: slice 01's offer is proven by a button appearing and a row coming
back with its old age reading; slice 03's cutoff by that button vanishing while the screen sits
untouched. Slice 02 is the exception that proves the rule, and §5.1 says so out loud rather than
letting a developer discover it at the red bar.

### 5.1 Which slices are red-first, which is a guard slice, and what must not be faked

**Slice 01 is red-first**: no offer exists and no `bringBack` exists, so **ten of its twelve**
scenarios fail on arrival. The two that do not are its bookends — *No offer exists until a removal
happens* and *A name that falls off on its own is never offered back* — which pass trivially while
nothing offers anything, and become real the moment the other ten do. They are kept as written: an
absence assertion is worth most when the thing it denies exists.

**Slice 03 is red-first**: nothing ages the offer, so its second, third and fourth scenarios fail on
arrival. Its first, *the offer still stands just short of a day*, is a **boundary guard** and passes
either way — it is there so that a cutoff written shorter than a day, or an offer ended by whichever
tick happens to touch it, fails in CI rather than in front of a visitor.

**Slice 02 is a guard slice, with no production change at all**, and that is a design decision rather
than an oversight. On the branch its own `Blocked by:` line gives it, the offer's whole lifecycle is
already present, because it **cannot arrive in halves**: `withSavedNames`' fourth parameter is
required, so every one of the six call sites in §4.1 has to answer the question in the slice that
introduces the parameter. Shipping a half-answer — `save` carrying the offer through its append
branch, say — would put a knowingly broken rule on `main` for the length of a slice, where the
visitor's own next press restores a name into a list that has moved under it. ADR-0007 refused
exactly that trade twice before, for smaller stakes; it is refused a third time here, and ADR-0048
records it.

A guard slice is an established kind in this repo (ADR-0005, ADR-0007: `greet-visitor` shipped two).
These seven guards are not tautologies — **each kills a specific, plausible wrong implementation**:

| Scenario | The mistake it kills |
| --- | --- |
| *The offer does not time out on its own* | Any implementation that puts the offer on the clock's tick — a countdown, an expiry timestamp on the offer itself. The seed rejects it in words; this fails it in CI. |
| *A further removal replaces the offer* | A stack or an array of removals — the shape "undo" invites and R39 forbids. |
| *A successful save ends the offer* | `save`'s append branch carrying `visit.lastRemoval` through, which is what a spread would do by default. |
| *A name falling off ends the offer* | The same mistake in `expire`, which is easier to make because the visitor did nothing. |
| *A refused save does not end the offer* | The two designs rejected in ADR-0044: "any call to `withSavedNames` clears the offer" and "the offer stands while `savedNamesRevision` is unchanged". Both are tidier than the chosen one and both fail here, because a refusal bumps the revision (ADR-0030). |
| *The offer survives everything that does not write to the list* | A component that resets the offer on re-render or on a sort toggle, and a `submit` branch that drops the field. |
| *Once spent, the offer does not return on its own* | An offer derived from "the last name that left the list" rather than stored by the removal — which would re-offer after a fall-off, too. |

**Do not weaken production code to manufacture a red bar in slice 02.** If any of these seven fails,
the fix is in the code introduced by the slice its own `Blocked by:` line points at.

### 5.2 Which invariants are live from which slice

Read as *"the slice that introduces it"* — **not** as an ordering claim. The order slices are built
in is stated in `issues/` and nowhere else (§5.5).

| Invariant | Introduced by | Note |
| --- | --- | --- |
| INV-34, INV-35, INV-36, P28, P29 | issue 01 | The offer, its single writer, and the restore — the whole "a removal is undoable" concept arriving whole (ADR-0007). |
| INV-37, INV-38 | issue 03 | The cutoff extracted to one owner, and the one answer the control and the command share. |
| INV-23 (amended), INV-21, INV-31 | issue 01 (amended) / *(merged)* | `submit`'s literal grows a fourth field with the parameter it carries; the revision and the day-old rule are unchanged in substance. |
| INV-17, INV-27–INV-33, P10–P27 | *(merged)* | Unchanged. INV-17 in particular is **inherited, not re-enforced**, on the bring-back path (§2.4, ADR-0045). |

### 5.3 The non-DOM tests, named so they are not mistaken for drift

`src/visit.test.ts` is an inner-cycle file (ADR-0003). This feature adds **three** assertions there.
No spies, no snapshots, no `renderHook`, and no new file.

- **INV-35 + INV-36, the inverse property** (issue 01) — for a visit holding five names,
  `bringBack(remove(v, 'Cleo')).savedNames` deep-equals `v.savedNames`, entry objects and all. This is
  the one assertion that states the *theorem* §2.4 relies on, at the middle of the list where an
  off-by-one shows, and it is the reason no count is needed on the bring-back path. The seam proves
  the visitor-facing half (issue 01's five-name scenario); this proves the value equality the limit
  is inherited from.
- **INV-34 totality** (issue 01) — `bringBack(v)` returns `v` **by reference** when there is no last
  removal, and leaves `savedNamesRevision` unchanged. Unreachable through the seam by construction
  (there is no button), which is exactly why it is pinned here: it is the same `holds`-guard idiom
  `remove` and `greetAgain` already carry.
- **INV-37/INV-38, the cutoff boundary** (issue 03) — `offeredName(visit, savedAt + DAY_MS)` returns
  the name (the offer **stands** at exactly a day) and `offeredName(visit, savedAt + DAY_MS + 1)`
  returns `null`, matching `expire`'s existing *older than, not at least* rule. Asserted through the
  exported projection, because `stands` is module-private and stays that way; sitting on the boundary
  through the seam would cost a 24-hour scenario per case for a difference no visitor can arrange.

Everything else about this feature is observable through the rendered DOM and belongs in a scenario.
No new constraint test is added: the offer's silence is an *absence of announcement*, which the
merged VH-02 constraint test's technique cannot reach (N18, N19).

### 5.4 Seam mechanics — what is carried, and the one thing to check first

Nothing about this feature needs a new probe: it adds no timer, no new markup shape and no new query
kind. Four mechanics are carried from ADR-0041's measurements and are relied on here — the narrowed
`toFake` list, `timePasses`, the tie-break under a stopped clock, and `key={name}` keeping a row's
DOM node across a list write.

**The one thing worth checking on the first red bar** is the offer's accessible name.
`<button>Bring {offered} back</button>` renders three text nodes; RTL's `name` option normalises
whitespace, and the merged `Greet me again as {name}` and `Remove {name}` controls are found the same
way today — so `getByRole('button', { name: 'Bring Ada back' })` is expected to work. If it does not,
the fix is a template literal in the JSX, never a regex in the test.

**Two things this seam cannot see**, unchanged from the merged features: whether a screen reader
actually speaks when the offer arrives (VH-02) and whether it stays silent when the offer goes
(VH-02). Neither is manufactured into a test that would pass without being true.

### 5.5 The queue

`issues/` owns the slice queue. **This design asserts no `Blocked by:` edge, restates none, and
contradicts none** [SD-07]. Where a slice's production dependencies mattered above (§5.1, §5.2), they
are phrased against *"the branch its own `Blocked by:` line gives it"* rather than by naming an
issue, so this document cannot drift away from the executable graph.

Each issue's acceptance steps were read against the capabilities available on the branch its own
`Blocked by:` line describes, looking for the `remembered-names` VH-01 failure — a step that must
*activate* a control the branch does not carry. **No such step exists in this feature.** Every control
any scenario activates is either merged already (the Name field, `Greet me`, `Save this name`,
`Greet me again as <name>`, `Remove <name>`, the `Newest first` checkbox) or is `Bring <name> back`,
which every issue that activates it either introduces or already has by its own declared blocker. Time
passing is not a control and needs nothing built.

**No defect is raised against the `po` node this round.**

---

## 6. Trade-offs, risks, and what is recorded where

### 6.1 ADR index (this feature)

| ADR | Decision |
| --- | --- |
| [0044](../../../docs/adr/0044-the-last-removal-is-a-field-of-the-visit.md) | The last removal is **a field of the visit, written only by the list's own private writer**, as a required fourth argument. Rejects screen state, a second aggregate, a revision-derived offer and a reference-identity-derived offer. |
| [0045](../../../docs/adr/0045-bringing-back-is-the-removals-inverse.md) | Bringing back is **the removal's exact inverse**, so the five-name limit is **inherited by identity of the value** rather than re-checked. Rejects a limit check, a clamp, and remembering a snapshot of the whole list. |
| [0046](../../../docs/adr/0046-the-offer-ages-by-projection-not-by-a-write.md) | The held entry's **ageing is derived on read**, not stored: `expire` does not clear the offer. Rejects clearing it in `expire`, a second `expireOffer` command, and a timer of the offer's own. |
| [0047](../../../docs/adr/0047-the-offer-is-presented-like-the-controls-it-sits-among.md) | The **component owns the offer's words and place**; the domain supplies the name. Pressing it reuses the removal's focus rule and **the render's own `now`**, so a visible offer is never inert. |
| [0048](../../../docs/adr/0048-undo-a-removal-acceptance-seam-and-slice-shape.md) | One acceptance seam for all three slices; **01 and 03 red-first, 02 a guard slice with no production change**; no new component (the sharpened tripwire is not tripped); the queue stays in `issues/`. |

### 6.2 Known risks, stated rather than mitigated away

1. **The offer's ending has no automated proof of silence.** N18's mechanism — `aria-relevant`
   excluding removals — is a fact about screen readers, not about jsdom. VH-02.
2. **The merged VH-02 constraint test now has an unstated-in-code exception** (N19). It is stated
   here and in VH-02; a developer who "strengthens" it by leaving an offer standing will make it fail
   for the right reason and read it as the wrong one.
3. **Slice 02 ships no production code.** Honest, precedented (ADR-0005, ADR-0007) and named — but it
   is the kind of thing a developer node under pressure "fixes" by weakening the code it builds on. §5.1
   says do not.
4. **A ≤15 s window at the cutoff.** The offer may be pressable up to one tick past its day-old mark,
   and the restored row then leaves on the next tick. That is the tick's staleness (N17/N20), shared
   with every row, and P29 guarantees the control and the command at least agree with each other.
   Unreachable in practice — a visit dies at unmount.
5. **`position` is the one piece of the held entry that is not a value of the domain's own making**
   (ADR-0042 said so first). Its validity rests on R41 holding. That chain is pinned by §5.3's inverse
   assertion, by five of slice 02's seven guards, and by `slice`'s clamping as a floor.
6. **`GreetingScreen.tsx` grows by roughly ten lines and no state.** The extraction tripwire is not
   tripped (ADR-0048); the next feature that adds screen state should extract rather than argue.
7. **One known coupling** (§2.5): the offer's words and the row's `Remove <name>` must name the same
   name; both interpolate one value and nothing enforces it.

### 6.3 Human checks this design does not close

Recorded in `.sdlc2/features/undo-a-removal/VERIFY-WITH-HUMAN.md`: **VH-01** (the offer's exact words
for an unusual saved name — the seed's own open question), **VH-02** (the screen-reader pass: is the
offer heard when it arrives, and silent when it ends — continuing the open `saved-name`,
`remembered-names` and `saved-at` screen-reader checks), **VH-03** (the offer's place among the
refusal, the sort control and the rows, read in the intended order), **VH-04** (the ≤15 s window at
the cutoff, and the architecture-side reading of the seed's "never refuses").
