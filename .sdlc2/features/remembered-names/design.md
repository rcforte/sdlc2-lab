# Design — Remembered names (`remembered-names`)

> Input: `.sdlc2/features/remembered-names/feature.md` (seed + product brief), `issues/01..07`,
> `mockup.html`. Existing merged code: `src/visit.ts`, `src/GreetingScreen.tsx`, `src/App.tsx`,
> `src/visit.test.ts`, `src/GreetingScreen.test.tsx`, and the ADRs of `greet-visitor`
> (`docs/adr/0001`–`0009`) and the merged single-slot `saved-name`
> (`docs/adr/0019`–`0025`), plus `.sdlc2/features/saved-name/VERIFY-WITH-HUMAN.md`
> (VH-01, VH-03, VH-ux-01, VH-ux-02 closed; VH-02/VH-04 still open as a screen-reader pass —
> honoured here, never relitigated). Output consumed by the `developer` node.
>
> This document designs the **domain model, the boundaries, the contracts, and the outer
> acceptance-test seam for each of the seven slices**. It changes no acceptance criterion, no
> issue, no line of `feature.md` and no line of `mockup.html`.
>
> **The slice queue is not stated here.** The `Blocked by:` lines in `issues/` are the only place
> it lives, and the only thing the build engine reads. This design declares no edge, restates no
> edge, and contradicts no edge. One disagreement with the queue is filed as a defect against the
> `po` node — §5.5 and `VERIFY-WITH-HUMAN.md` VH-01 — never as an edge asserted here.
>
> **Numbering.** ADRs continue at **0026**: `docs/adr/0010`–`0018` are already claimed on the
> unmerged `slice/greeting-log/*` branches (a concurrent, separate feature — `feature.md` *Out of
> scope*), and `0019`–`0025` are merged. Two ADRs with the same number and different slugs merge
> without a git conflict; a numbering gap does not. Rules continue at **R18**, invariants at
> **INV-17**, presentation invariants at **P13**, non-functionals at **N9**, for the same reason:
> an id means one thing across this repo.

---

## 1. Problem understanding

### 1.1 What already exists (and is not redesigned here)

`greet-visitor` and the single-slot `saved-name` are merged. `src/visit.ts` holds one aggregate,
`Visit`, with three commands (`submit`, `save`, `greetAgain`), four projections (`greetingText`,
`alertText`, `savedNameText`, `savedNameRegionText`), two monotonic counters that make every
submission perceivable (`greetingCount`, `blankCount` — ADR-0009) and a third for saves
(`saveCount` — ADR-0023). The screen is one component, `src/GreetingScreen.tsx`, holding two
`useState` hooks that die at unmount (ADR-0004, ADR-0019). The suite is 50 DOM scenarios plus
`src/visit.test.ts`.

This feature **replaces the single slot with a list** inside that same aggregate and the same
component. It introduces no new layer, no new dependency, no new test stack, and — deliberately,
and re-argued rather than inherited — no new component (§4.2, ADR-0033).

It also **retires** merged behaviour: replacing (there is nothing to replace), the fixed-name
`Greet me again` control (rows carry their own name now), the `Saved name` heading and empty-state
copy, and the `savedNameRegionText` projection. §4.3 names every merged test that goes with them,
so no lane discovers this by watching the merged suite go red.

### 1.2 Functional requirements (restated as rules)

| # | Rule | Source | Supersedes |
| --- | --- | --- | --- |
| R18 | The visit holds an **ordered list of at most five** saved names, oldest first. A name **never moves** once it is in the list. | Seed *Agreed scope*, *Decisions*; issue 01 | R10 |
| R19 | **Saving appends the name the visitor is currently greeted as** — never the Name field's draft. There is nothing to save before a greeting, so the save control does not exist then (absent, not disabled). | Seed *Agreed scope*; issue 01 | — (R11 stands, generalised) |
| R20 | Saving a name **already in the list** changes nothing — no second row, no reordering — and says **"`<name>` is already saved."** | Seed *Agreed scope*; issue 04 | R12 (replacing is retired) |
| R21 | Saving while the list holds **five** names is refused with **"Five names is the limit. Remove one to save another."** Nothing is saved and nothing is dropped, and the save control **stays on screen**. | Seed *Agreed scope*, *Decisions*; issue 05 | — |
| R22 | **Removing** takes exactly one name out of the list; the others keep their order; the freed slot is immediately usable. Removal is the only way a name leaves. | Seed *Agreed scope*; issue 03 | — |
| R23 | **Greeting again is an ordinary greeting**, as **any** saved name: the one existing submission transition with that name substituted for the field's draft. The status region re-announces even when the name is unchanged, a standing blank-name alert clears, the draft is untouched, and the list does not change. | Seed *Agreed scope*; issue 02 | R13 |
| R24 | **Removing does not touch the greeting**, and **blank submissions never touch the list**. Being greeted and being saved are independent. | Seed *Agreed scope*; issues 01, 03 | R16 (greeting half) |
| R25 | **Every save attempt and every removal is perceivable.** The Saved names region is a polite live region whose contents are renewed by a save, by a refusal (including the same refusal twice) and by a removal. **Removing moves focus to the region; saving does not move focus**, and neither does greeting again. | Seed *Agreed scope*, *Decisions*; issues 01, 03, 04 | R15 |
| R26 | The Name field's **saved-name hint** names **every** saved name in list order — visible text `Saved: <name>, <name>` associated as a description; absent while nothing is saved. When a blank-name alert is present too, the field is described by **both, alert first**. | Seed *Agreed scope*; issue 06 | R14 |
| R27 | A **fresh visit** has nothing saved: no rows, no save control, no row controls, no hint, no refusal. Everything is in memory. | Seed *Agreed scope*; issue 07 | R16 (fresh-visit half) |
| R17 | **Every control of the region sits inside the region and outside the `<form>`**, so Enter in the Name field still greets from the field. *(Unchanged; now covers the row controls too.)* | Seed *Agreed scope*; issues 01–03 | — |

### 1.3 Non-functional / cross-cutting requirements

| # | Requirement | Consequence for this design |
| --- | --- | --- |
| N9 | The Saved names region is now a live region that **contains interactive controls**, and every save inserts two more of them into it. A screen reader will therefore read the new row's control names as part of the announcement. | Not fixable at this seam and not invented away: the region must announce (seed) and the rows must carry named controls (seed). Recorded as the human listening check **VH-04**, continuing `saved-name` VH-02/VH-04. The design keeps the *inserted* text minimal (name, then two controls) and never re-inserts untouched rows (P15, ADR-0030 — measured, §5.4). |
| N10 | A save must not re-announce the greeting, and a greeting must not re-announce the list. | The three live regions are renewed by three independent counters: `greetingCount`, `blankCount`, `savedNamesRevision`. `submit` never advances the third; `save`/`remove` never advance the first two. Measured, §5.4. |
| N11 | Slices build in parallel worktrees (`install: npm ci`). Nothing may depend on shared mutable state or a fixed port. | Unchanged by this feature: no new dependency, no new file, no server, no global. |
| N12 | The merged suite must stay green in every lane, including the lanes that retire part of it. | §4.3 is a per-slice list of the merged scenarios that this feature deletes or rewrites, and of the merged scenarios that must survive untouched. |

### 1.4 Explicit non-goals (from the seed, restated so the design can be checked against them)

No persistence of any kind (no backend, no `localStorage`/`sessionStorage`), no greeting log, no
reordering/sorting/renaming, no in-place editing, no saving a name never greeted, no copying a
saved name into the field, no undo or confirm, no count on screen, no configurable limit, no
change to blank-submission behaviour, no timestamps, no i18n. Nothing below adds a seam, a port or
a field for any of them.

---

## 2. Domain model

### 2.1 Bounded context

**Still one context: `Greeting`.** The saved names are not a second context: the list has no
independent lifecycle (it dies with the visit), no identity, and no rule that could be true while
the greeting's rules are false. Every transition it has either reads a fact the context already
owns (`save` reads the greeting) or drives one (`greetAgain` drives a submission).

The app shell (`App`, `AppBanner`, `main.tsx`) remains a composition root that knows none of these
rules. There is **no integration, no anti-corruption layer and no driven port** anywhere in this
feature, because there is nothing to integrate with (ADR-0006 stands).

### 2.2 Ubiquitous language → code names

| Term (seed) | Code name | Kind |
| --- | --- | --- |
| **Saved names** — the ordered set the visit holds onto, at most five | `savedNames: readonly string[]` (a field of `Visit`; `[]` on a fresh visit) | Value (aggregate state) |
| **Nothing saved** | `savedNames.length === 0`, rendered as `NOTHING_SAVED_MESSAGE` | State |
| **Saving** — appending the name currently greeted | `save(visit): Visit` — takes **no name argument** (ADR-0020 stands) | Command |
| **Already saved** | `SaveRefusal = { kind: 'already-saved', name }` — data, never a message in state (ADR-0027) | Value |
| **Full** / **the limit** | `savedNames.length >= SAVED_NAMES_LIMIT`, `SAVED_NAMES_LIMIT = 5` | State / constant |
| **Removing** | `remove(visit, name): Visit` | Command |
| **Row** | one `<li key={name}>` in `GreetingScreen` — a **value**, not an entity (ADR-0029) | Driving-adapter detail |
| **Greeting again** | `greetAgain(visit, name): Visit`, whose body is `submit(visit, name)` for a saved name (ADR-0021 amended by ADR-0029) | Command (composed) |
| **Saved-name hint** | `savedNamesHintText(visit): string \| null` → `Saved: Ada, Bob` | Derived value |
| the refusal a visitor reads | `refusalText(visit): string \| null` | Derived value |
| *how many times the list has been written this visit* | `savedNamesRevision: number` (monotonic; identity, never displayed) | Value (aggregate state) |
| Empty-state copy | `NOTHING_SAVED_MESSAGE = 'No names saved yet.'` | Constant |
| Limit copy | `FULL_LIST_MESSAGE = 'Five names is the limit. Remove one to save another.'` | Constant |
| **Save control**, **row controls**, the heading | JSX nodes in `GreetingScreen`, named there and nowhere else (ADR-0003 stands: no role, id or `aria-*` name appears in `visit.ts`) | Driving-adapter detail |

**Retired:** `savedName` (scalar), `saveCount`, `savedNameText`, `savedNameRegionText`, and the
term **Replacing** (seed, *Deliberately retired*). Carried over unchanged: **Visitor, Name,
Greeting, Blank name, Trimmed, Fresh visit, Status region, Alert** — in particular **Fresh visit**
is still "one mount of `GreetingScreen`" (`greet-visitor` VH-02), which is why issue 07 needs no
new mechanism.

### 2.3 The aggregate

```
Aggregate root: Visit      (in-memory, per mount, no identity, no persistence)
  state
    greetedName            : string | null        -- unchanged                       (INV-2)
    greetingCount          : number               -- unchanged                       (INV-8a)
    lastSubmissionWasBlank : boolean              -- unchanged                       (INV-5a)
    blankCount             : number               -- unchanged                       (INV-8b)
    savedNames             : readonly string[]    -- REPLACES savedName              (INV-17)
    lastSaveRefusal        : SaveRefusal | null   -- NEW. outcome of the last attempt (INV-20)
    savedNamesRevision     : number               -- REPLACES saveCount              (INV-21)
  commands  (all pure, total, synchronous; replace the value wholesale, never mutate)
    submit(rawName)        -- unchanged transition; carries the three list fields through (INV-23)
    save()                 -- appends the greeting, or refuses (already saved / full)  (INV-17, INV-18)
    remove(name)           -- takes out exactly that name, or nothing                  (INV-19)
    greetAgain(name)       -- submit(visit, name) for a saved name; identity otherwise  (INV-22)
  private transition (module-scoped, not exported)
    withSavedNames(names, refusal)
                           -- the ONLY writer of savedNames + lastSaveRefusal + savedNamesRevision;
                              the three always change together                        (INV-20, INV-21)
  projections (pure reads, no state)
    greetingText()          -> unchanged
    alertText()             -> unchanged
    savedNamesHintText()    -> null | `Saved: ${savedNames.join(', ')}`               (INV-25)
    refusalText()           -> null | `${name} is already saved.` | FULL_LIST_MESSAGE (INV-26)
```

**Still exactly one aggregate, and that is again the load-bearing decision.** `save` **reads**
`greetedName` and **writes** `savedNames`; `greetAgain` **reads** `savedNames` and drives the
write of `greetedName`; `remove` writes the list and, by rule, must leave the greeting alone. If
the list lived in a second aggregate — a `SavedNames`, a `Bookmarks`, a second `useState` — each
of those single visitor actions would become a read of aggregate A followed by a write to
aggregate B that has to land together to be correct, coordinated in a click handler. **No
operation in this feature spans two aggregates, because there is still only one** (ADR-0026).

**Entities:** none. A row is a value keyed by its own name (ADR-0029). **Domain events:** none —
ADR-0006 stands: nothing subscribes, the "announcement" is an ARIA live region and not a bus.
**Value objects:** `savedNames` entries are plain `string`s and deliberately not a branded type —
each is *by construction* a value `greetedName` already held, so it inherits INV-2's "trimmed and
non-blank" without re-deriving it (ADR-0020 stands). `SaveRefusal` **is** a value object, and the
only new type this feature introduces.

### 2.4 Invariants and their owners

Every invariant names **exactly one enforcement point** — one function or one component a reader
can open. Where a rule has two halves with two natural owners, it is split so each half still has
one owner (the house rule from `greet-visitor` §2.4).

| ID | Invariant | Single owner | How it is enforced there |
| --- | --- | --- | --- |
| INV-17 | **The list's shape: no duplicates, at most `SAVED_NAMES_LIMIT` (5), and insertion order that never changes.** A name is appended at the end or not at all; nothing ever moves. | `save` in `src/visit.ts` | `save` is the **only** function that ever adds a name, and it adds only after both checks: `savedNames.includes(name)` ⇒ already-saved refusal; `savedNames.length >= SAVED_NAMES_LIMIT` ⇒ full refusal; otherwise `[...savedNames, name]`. `remove` cannot violate any of the three (a filter cannot add, cannot duplicate, cannot reorder), so the rule has one owner and not two. The bound is a constant beside the rule, never a magic number in a component. |
| INV-18 | **`save` captures the greeting and only the greeting, and is total**: `greetedName === null` ⇒ `save(visit) === visit` by identity, with no revision bump. | `save` in `src/visit.ts` | It takes **no name argument** — the absence is the guarantee (ADR-0020 stands), so no caller can save a draft or an invented name. One guard clause returns the input value. P17 (the control's absence before a greeting) is the *affordance*, never the rule. Unit-asserted (§5.3), because the DOM cannot reach it. |
| INV-19 | **`remove(visit, name)` takes out exactly the named entry and leaves every other name in its place; removing a name that is not saved changes nothing** (identity, no revision bump). | `remove` in `src/visit.ts` | `savedNames.filter(n => n !== name)` after a membership guard. Order preservation is a property of `filter`, not a second rule; "exactly one" follows from INV-17's no-duplicates. |
| INV-20 | **The refusal describes the most recent save attempt and never outlives the list state it describes.** A successful save and every removal clear it; nothing else can leave a stale one behind. | `withSavedNames` in `src/visit.ts` (module-private) | The three list fields are written **only** by this one function, which takes the new refusal (or `null`) in the same call as the new list. A list write without a refusal decision is unrepresentable, so "clear the message too" is not something `save` and `remove` each have to remember (ADR-0027). |
| INV-21 | **Every write to the list is a new event**, including a refusal that changes nothing and a removal: `savedNamesRevision` is incremented by `withSavedNames` and changed nowhere else, ever. Monotonic per visit; reset only by `newVisit`. Never branched on, never compared, never rendered as text. | `withSavedNames` in `src/visit.ts` | Same mechanism ADR-0009 established for `greetingCount`, now storing *identity* for the region (ADR-0030). The no-op commands (INV-18, INV-19, INV-22) return the input value and never reach this function, so a press that could not do anything is not counted as an event. |
| INV-22 | **Greeting again is the same greeting, and only as a name that is saved.** `greetAgain(visit, name)` is `submit(visit, name)` when `savedNames.includes(name)`, and the identity function otherwise. There is **no second transition**. | `greetAgain` in `src/visit.ts` | The body delegates to `submit` and does nothing else, so R23's consequences (status renewed, alert cleared, draft untouched, `greetingCount` advanced, list untouched) are inherited rather than restated. Entries are non-blank by INV-17+INV-2, so `submit` always takes its non-blank branch: "greeting again clears a standing alert" needs no rule of its own. The membership guard is what keeps the old no-argument guarantee's *spirit* after the signature had to grow one (ADR-0029). |
| INV-23 | **Nothing but `save`/`remove` (through `withSavedNames`) writes the three list fields.** `submit` carries all three through unchanged on **both** branches, so a blank submission never touches the list (R24) and greeting again never re-saves, re-refuses or re-announces the region (R23, N10). | `submit` in `src/visit.ts` | The blank branch is a spread and carries them for free. The non-blank branch is an **exhaustive object literal**, so all three must be listed — omitting one is a `tsc` error under `npm run build`, not a silent bug. Successor to INV-13, unchanged in kind. |
| INV-24 | **The list's lifetime is exactly one mount of `GreetingScreen`**: it begins `[]`, it ends at unmount, and no reset logic exists. | `GreetingScreen`, via INV-6a | Deliberately **not new work**: the three fields belong to `Visit`, and INV-6a already pins `Visit` to one `useState` inside the component (ADR-0004, ADR-0019). This row exists so R27 has a visible owner, and so a reader can see why issue 07 needs no mechanism. |
| INV-25 | Hint text is `Saved: ` + the names joined with `, ` in list order, and `null` when the list is empty. **This is the only place that phrasing and that separator exist.** | `savedNamesHintText` in `src/visit.ts` | One formatter, one consumer (the hint element). It replaces `savedNameText`, whose single-name phrasing is the `n === 1` case of this one, so the merged hint scenarios keep passing verbatim (§4.3, ADR-0032). |
| INV-26 | The refusal's words are `${name} is already saved.` or `FULL_LIST_MESSAGE`, and `null` when the last attempt was not refused. **This is the only place either sentence exists.** | `refusalText` in `src/visit.ts` | A `switch` over `SaveRefusal['kind']` with no default branch, so a third refusal kind added later is a `tsc` error rather than a silent `null`. The component never types either sentence, and the empty state is a third constant it also never types (§2.5). |

**Superseded by the table above** (recorded so no reader is left holding a merged rule this
feature contradicts): INV-9 → INV-17; INV-10 → INV-18; INV-11 → INV-21; INV-12 → INV-22;
INV-13 → INV-23; INV-14 → INV-24; INV-15 → INV-25; **INV-16 is retired outright** — the region's
words are no longer one string, and its empty-state decision moves to P15 plus the exported
constant (ADR-0032). INV-1..INV-8b are untouched.

**Presentation invariants** (owned by `GreetingScreen` and nothing else — the domain still knows
nothing of ARIA, roles, ids or element shape):

| ID | Invariant | Enforced by |
| --- | --- | --- |
| P13 *(supersedes P7)* | The **Saved names region** is rendered on every render from first mount, **after** the status region, as `<section aria-labelledby={SAVED_NAMES_HEADING_ID} aria-live="polite" tabIndex={-1} ref={savedNamesRegion}>` containing a visible `<h2 id={SAVED_NAMES_HEADING_ID}>Saved names</h2>`. It **never** carries `role="status"`. | Unconditional JSX, never inside a `{cond && …}` — a live region must be observed before its text arrives (VH-04 of `greet-visitor`). `role="region"` is the implicit role of a named `<section>`; the name comes from the visible heading, so the heading a visitor reads and the name a test queries are one node (ADR-0022 stands). `tabIndex={-1}` (never `0`) makes it a focus destination without making it a tab stop (ADR-0031). No `role="status"`: issue 01 forbids it, and a second one would make every bare `getByRole('status')` in the merged suite ambiguous. |
| P14 | The **refusal element** is rendered **iff** `refusalText(visit) !== null`, between the heading and the rows, as `<p key={visit.savedNamesRevision}>`. | One `{refusal !== null && <p key={visit.savedNamesRevision}>{refusal}</p>}`. The key is read from the aggregate, never computed here: it is what makes the *same* refusal twice a new DOM node, so the live region speaks again instead of falling silent (ADR-0030; measured §5.4). Position matches `mockup.html` stories 04/05. |
| P15 *(supersedes P8)* | The region shows **either** the empty state `<p>{NOTHING_SAVED_MESSAGE}</p>` (iff `savedNames.length === 0`) **or** a `<ul>` of one `<li key={name}>` per saved name, in `savedNames` order. Never both, never neither. | One ternary on `savedNames.length`. `key={name}` is legitimate **because** INV-17 forbids duplicates — so appending or removing leaves every untouched row's DOM nodes (and their focus) alone (measured, §5.4). The component never types the empty-state string; it reads the exported constant. |
| P16 | Each row renders, in DOM order: the **name**, then `Greet me again as <name>`, then `Remove <name>`. | One row body. The order is `mockup.html`'s, and it is this node's call to make (product brief, final paragraph): the **destructive control comes last**, so neither keyboard order nor pointer aim puts *Remove* where a visitor reaching for *Greet me again* will land (ADR-0031). |
| P17 *(supersedes P6)* | The **save control** is rendered **iff** `visit.greetedName !== null`, inside the region, **after** the rows, `type="button"`, never disabled and **never hidden because the list is full**. | One `{visit.greetedName !== null && <button type="button" …>Save this name</button>}`. It is the affordance for INV-18, never its enforcement. The list being full is deliberately *not* part of the condition: the refusal teaches the limit, a vanishing button teaches nothing (seed, *Decisions*). |
| P18 *(supersedes P11)* | There is **no screen-level greet-again control**. Greeting again exists only on rows. | The merged fixed-name `Greet me again` button and its condition are deleted; the only `greetAgain` callers are row controls (§4.3, ADR-0029). |
| P19 | **Focus moves on removal and on nothing else.** The remove handler is `setVisit(v => remove(v, name)); savedNamesRegion.current?.focus()`. No other handler in this component calls `focus()`. | The region is guaranteed mounted (P13), so the imperative call in the handler needs no `useEffect` and no flag; measured to survive the re-render (§5.4). Saving and greeting again move nothing: their controls survive their own activation, because neither lives inside a keyed node (P14 is the only keyed node in the region, and no control is inside it) — `saved-name` VH-ux-02, honoured. |
| P20 *(supersedes P9)* | The **saved-name hint** element is rendered **iff** `savedNamesHintText(visit) !== null`, is **visible**, sits beside the Name field, and carries `SAVED_NAMES_HINT_ID`. | One `{hint !== null && <p id={SAVED_NAMES_HINT_ID}>{hint}</p>}`, evaluated from the same expression P10 reads, so element and reference cannot disagree. Visible text, never an `aria-label` and never a placeholder. |
| P10 *(unchanged)* | The Name field's `aria-describedby` is the ordered list of ids whose elements are present — **alert first, hint second** — and the attribute is **absent entirely** when neither is. | The existing computed value, with `savedNamesHintText` substituted for `savedNameText`. ADR-0024 stands unamended. |
| P12 *(unchanged, extended)* | Every control in the region is `type="button"` and lives inside the region, which is **outside the `<form>`**; no control is inside a keyed node. | Activating any of them cannot submit the form (R17), and each survives its own activation with focus intact unless P19 deliberately moves it. |

> **What is deliberately *not* an invariant.** There is no runtime "at most five" assertion — the
> only writer already refuses the sixth. There is no rule that a save leaves the greeting alone —
> `save` cannot write `greetedName`. There is no rule that the hint and the rows agree — they read
> the same list. Each would be an invariant with no possible violation: cost with no work.

### 2.5 Where visitor-facing text lives

Unchanged in principle, extended consistently: the **domain module owns the messages** (the
`Saved: ` phrasing and its `, ` separator inside `savedNamesHintText`; the two refusal sentences
inside `refusalText`/`FULL_LIST_MESSAGE`; `NOTHING_SAVED_MESSAGE`), because they are rule output.
The **component owns element shape and control names** (`'Save this name'`, `'Greet me again as
<name>'`, `'Remove <name>'`, the heading `'Saved names'`, roles, ids, `aria-*`).

Row control names **interpolate the row's name**, which reverses the single-slot rule that control
names are fixed. The seed's *Decisions* supersede it explicitly and give the reason: a row's
control acts on one name for as long as the row exists, so it cannot drift, while five buttons all
announcing "Greet me again" would be indistinguishable to anyone not looking at the screen.

**One known coupling, stated rather than engineered away:** `SAVED_NAMES_LIMIT = 5` and the word
*"Five"* inside `FULL_LIST_MESSAGE` must agree, and nothing enforces it. Interpolating the number
into the sentence was rejected: the copy is agreed English (*"Five names is the limit"*, not *"5
names is the limit"*), and making the limit configurable is out of scope, so the generality would
buy nothing. The tripwire is that both live in `src/visit.ts` within a few lines of each other, and
the constant exists so no component ever holds the number.

---

## 3. Architecture

Unchanged in shape from the two merged features: a **modular monolith of one context**, with a
pure domain module and one driving adapter. No new layer, no new dependency.

```
                       ┌────────────────────────────────────────────────────┐
  visitor ── DOM ────► │  Driving adapter:  src/GreetingScreen.tsx           │
  (RTL + user-event)   │  • useState<string>  rawName   (draft, INV-6c)      │
                       │  • useState<Visit>   visit     (INV-6a, INV-24)     │
                       │  • useRef<HTMLElement> savedNamesRegion  (P19)      │
                       │  • element shape, ids, ARIA, control names          │
                       │    (P10, P12..P20) — no rules, no copy of its own   │
                       └───────────────┬────────────────────────────────────┘
                                       │ calls commands, reads projections
                                       │ (plain function calls; no port object,
                                       │  no injection — ADR-0006)
                       ┌───────────────▼────────────────────────────────────┐
                       │  Domain:  src/visit.ts   (pure, total, synchronous) │
                       │  Visit aggregate  ── one consistency boundary       │
                       │    submit · save · remove · greetAgain              │
                       │    withSavedNames  (private: the only list writer)  │
                       │    greetingText · alertText                         │
                       │    savedNamesHintText · refusalText                 │
                       │  imports nothing · touches no browser global        │
                       │  (INV-6b, guarded lexically — ADR-0008)             │
                       └─────────────────────────────────────────────────────┘

  App / AppBanner / main.tsx : composition root. Knows none of the above.
  Driven side               : none. No repository, no clock, no storage, no network.
```

**Data flow of the four visitor actions** (each is one pure transition and one `setVisit`):

```
submit (form)      rawName ─► submit(visit, rawName) ─► greeting or alert; list carried through
save   (button)    ()       ─► save(visit)           ─► appended | already-saved | full refusal
remove (row)       name     ─► remove(visit, name)   ─► shorter list, refusal cleared, focus to region
greet again (row)  name     ─► greetAgain(visit,name)─► submit(visit, name); list untouched
```

**Ports.** The one seam that exists is the **domain module's exported surface** (§4.1): the
component depends on it, it depends on nothing. There is deliberately no driven port — ADR-0006
stands, and ADR-0019's note still applies: a future "remember across visits" capability would need
one, and this design keeps the state where a port cannot reach it, because persistence is
explicitly out of scope.

---

## 4. Contracts

### 4.1 Domain module — `src/visit.ts`

```ts
export const ALERT_MESSAGE = 'Please enter your name.'            // unchanged
export const NOTHING_SAVED_MESSAGE = 'No names saved yet.'        // copy change (was singular)
export const FULL_LIST_MESSAGE = 'Five names is the limit. Remove one to save another.'
export const SAVED_NAMES_LIMIT = 5

export type SaveRefusal =
  | { readonly kind: 'already-saved'; readonly name: string }
  | { readonly kind: 'full' }

export type Visit = {
  readonly greetedName: string | null
  readonly greetingCount: number
  readonly lastSubmissionWasBlank: boolean
  readonly blankCount: number
  readonly savedNames: readonly string[]        // INV-17. [] on a fresh visit
  readonly lastSaveRefusal: SaveRefusal | null  // INV-20. null on a fresh visit
  readonly savedNamesRevision: number           // INV-21. 0 on a fresh visit
}

export const newVisit: Visit                    // savedNames: [], lastSaveRefusal: null, revision: 0

export function isBlank(rawName: string): boolean                 // unchanged
export function submit(visit: Visit, rawName: string): Visit      // unchanged + INV-23
export function save(visit: Visit): Visit                         // INV-17, INV-18, INV-20, INV-21
export function remove(visit: Visit, name: string): Visit         // INV-19, INV-20, INV-21
export function greetAgain(visit: Visit, name: string): Visit     // INV-22
export function greetingText(visit: Visit): string                // unchanged
export function alertText(visit: Visit): string | null            // unchanged
export function savedNamesHintText(visit: Visit): string | null   // INV-25
export function refusalText(visit: Visit): string | null          // INV-26

// module-private, NOT exported: the only writer of the three list fields (INV-20, INV-21)
function withSavedNames(visit: Visit, savedNames: readonly string[], refusal: SaveRefusal | null): Visit
```

Behavioural contract, in words a test can be written from:

| Call | Precondition | Result |
| --- | --- | --- |
| `save(v)` | `v.greetedName === null` | `v` itself (identity). No revision bump. |
| `save(v)` | greeted, name already in `savedNames` | list unchanged, `lastSaveRefusal = {already-saved, name}`, revision +1 |
| `save(v)` | greeted, not saved, `savedNames.length === 5` | list unchanged, `lastSaveRefusal = {full}`, revision +1 |
| `save(v)` | greeted, not saved, fewer than 5 | `[...savedNames, greetedName]`, `lastSaveRefusal = null`, revision +1 |
| `remove(v, n)` | `n` not in `savedNames` | `v` itself (identity). No revision bump. |
| `remove(v, n)` | `n` in `savedNames` | that entry gone, order kept, `lastSaveRefusal = null`, revision +1 |
| `greetAgain(v, n)` | `n` not in `savedNames` | `v` itself (identity) |
| `greetAgain(v, n)` | `n` in `savedNames` | exactly `submit(v, n)` — list fields carried through by INV-23 |
| `submit(v, raw)` | any | unchanged behaviour; all three list fields carried through untouched |

**Refusal precedence.** When the list is full *and* the greeted name is already in it, the
**already-saved** refusal wins: it is the true reason nothing was added, and telling the visitor to
remove a name would send them to make room for a name that is already there. No acceptance
criterion decides this; recorded as **VH-03**.

**Name identity is exact string equality** (already trimmed by INV-2): `"ada"` and `"Ada"` are two
different saved names, exactly as they are two different greetings today. ADR-0028; human check
**VH-02**.

### 4.2 Component contract — `src/GreetingScreen.tsx`

State: the two existing hooks, unchanged, plus **one ref** (`useRef<HTMLElement>` for the region,
P19). No third piece of state, no reducer, no context, no store (ADR-0004 stands).

Region markup, top to bottom: `<h2>Saved names</h2>` · the refusal `<p>` when there is one (P14) ·
the empty state **or** the `<ul>` of rows (P15, P16) · the save control when there has been a
greeting (P17). Everything above lives inside the `<section>`, which lives outside the `<form>`.

**No new component.** ADR-0025's extraction tripwire — *extract when a second screen needs the
region, or when `GreetingScreen` acquires a third piece of state that no other part of it reads* —
is re-run here, not inherited: there is still one screen, and the new ref is not state (it is a
handle on a node this component already renders). What *has* changed is size: the region grows from
~10 to ~35 lines of JSX. The tripwire is therefore restated with that in mind and one addition —
**extract `SavedNamesRegion` when it needs state of its own, or when a second screen renders it**
— because extracting now would produce a component owning no rule, taking `visit` plus three
callbacks, and (per `CLAUDE.md`'s sibling-test rule) either a second test file duplicating these
scenarios or an untested component. ADR-0033 records the alternatives.

### 4.3 What this feature retires from the merged suite

The merged suite is 50 DOM scenarios. This feature contradicts some of them **by product
decision**, so those must be deleted or rewritten in the same slice that contradicts them — a lane
that leaves them in place goes red for a reason that is not a defect. Each row below names the
slice whose own acceptance criteria replace it.

| Merged test (file) | Fate | Replaced by |
| --- | --- | --- |
| `shows an empty Saved name region, after the status region, before any greeting` | **rewrite** in slice 01 | issue 01 scenario 1 (`Saved names`, `No names saved yet.`) |
| `saves the name the visitor was just greeted as` | **rewrite** in slice 01 | issue 01 scenario 3 — the region now shows a **row**, not `Saved: Ada` |
| helper `saveTheGreetedName` (asserts region text `Saved: <name>`) | **rewrite** in slice 01 | assert a row for `<name>` inside the region |
| `replaces the previous saved name when the visitor saves again` | **delete** in slice 01 | R20 (nothing is replaced any more) |
| `replaces without asking, and offers no way back` | **delete** in slice 01 | its closed-list-of-buttons step is false once rows carry controls |
| `still replaces, and keeps focus, when the same name is saved again` | **delete** in slice 01 | focus half survives as issue 01 scenario 5; replacing does not |
| `updates the hint when the saved name is replaced` | **delete** in slice 01 | issue 06 scenario 3 (updates as names are saved and removed) |
| the eight `Greet me again` scenarios (`offers no greet-again control…` … `does not submit the form…`) | **delete** in slice 01, **replaced** in slice 02 | issue 02's seven scenarios, per row |
| `starts with nothing saved on a fresh visit after saving` / `…after greeting again` | **rewrite** in slice 01 (region copy) and again where issue 07's own scenarios land | issue 07's three scenarios |
| `visit.test.ts`: `counts every save… (INV-11)` | **rewrite** in slice 01 | INV-21 (a *refused* save still advances the revision) |
| `visit.test.ts`: `does nothing when there is no greeting to save (INV-10)` | keep, adjust assertion to `savedNames` | INV-18 |
| `visit.test.ts`: `does nothing when there is no saved name to be greeted as (INV-12)` | **delete** in slice 01, **replaced** in slice 02 | INV-22 (`greetAgain(v, 'Ada')` with Ada not saved ⇒ identity) |
| `visit.test.ts` import of `savedNameRegionText` | **delete** in slice 01 | the projection is retired (ADR-0032) |

**Must survive untouched, in every lane** — they are this feature's regression net: all of
`greet-visitor`'s scenarios (trimming, blank alert, alert-to-field wiring, Enter-to-submit, fresh
visit after a greeting/alert, the `App.test.tsx` composition scenario), the `never writes to web
storage` constraint test, the `INV-6b` lexical purity guard, and the three hint scenarios that are
still true with one saved name (`leaves the Name field undescribed while nothing is saved`,
`describes the Name field with the saved name once a name is saved`, `keeps the hint at the Name
field while the visitor is mid-draft`, `describes the Name field with the alert before the hint`).
That last group is *why* the hint's formatter generalises instead of being deleted and rebuilt
(ADR-0032).

**One non-scenario change, in the slice that closes issue 07:** the existing `never writes to web
storage` constraint test drives greet / blank / correct only. Its exercise path should gain a save,
a refused save and a removal. This is not an acceptance criterion and adds no Gherkin step (issue
07 rules that out, and rightly — it is the one guarantee not observable through the rendered DOM);
it is the existing constraint test kept in step with the domain it constrains, as
`greeting-log`'s ADR-0018 argued for the same test.

---

## 5. The seam — per slice

**Seam family (all seven slices):** the project's declared frontend seam —
**React Testing Library + user-event via Vitest (jsdom)** — driving the rendered DOM by role and
accessible name. All **40** acceptance scenarios are driven through it. No slice introduces a
different kind of acceptance test, and no slice needs a backend seam (there is none:
`seam.backend: ""`). Run with `npm test -- --run`; typecheck with `npm run build`.

**One entry point for the whole feature: `render(<GreetingScreen />)`**, in
`src/GreetingScreen.test.tsx`. `src/App.test.tsx` gains **no** `it`: no acceptance criterion here
mentions the app shell, the composition is already pinned by its one existing scenario, and
ADR-0005's tripwire says a second `it` there is the signal the suite has begun duplicating itself.
`GreetingScreen` is also the mount whose unmount/remount **is** a fresh visit (`greet-visitor`
VH-02), which is what issue 07 needs.

| Slice | Issue | Kind | Outer seam (file · entry point · the queries it turns on) | Scenarios | Production change |
| --- | --- | --- | --- | --- | --- |
| 01 | `01-hold-more-than-one-saved-name` | **red-first** | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` · `getByRole('region', { name: 'Saved names' })`, `within(region).getAllByRole('listitem')` for rows and their order, `getByRole('button', { name: 'Save this name' })`, `toHaveAttribute('aria-live','polite')`, `compareDocumentPosition` for region-after-status, `toHaveFocus()` | **8** | `visit.ts`: `savedNames`, `lastSaveRefusal`, `savedNamesRevision`, `withSavedNames`, `save` (append **and** both refusals), `savedNamesHintText`, `refusalText`, the three constants, `submit`'s carried fields (INV-17, INV-18, INV-20, INV-21, INV-23, INV-25, INV-26). `GreetingScreen.tsx`: region (P13), refusal node (P14), rows/empty state (P15), save control (P17), retirement of the merged greet-again control (P18). Plus §4.3's deletions and the two named unit assertions (§5.3) |
| 02 | `02-greet-again-as-any-saved-name` | **red-first** | same file · same entry point · `getByRole('button', { name: 'Greet me again as Ada' })`, `getByRole('status')` for the greeting, `queryByRole('alert')`, `toHaveValue('Grace')` for the untouched draft | **7** | `visit.ts`: `greetAgain(visit, name)` (INV-22). `GreetingScreen.tsx`: the row's greet-again control (P16, P12). One more unit assertion (§5.3) |
| 03 | `03-remove-a-saved-name` | **red-first** | same file · same entry point · `getByRole('button', { name: 'Remove Bob' })`, `getAllByRole('listitem')` for the surviving order, `expect(region).toHaveFocus()`, `toHaveTextContent('No names saved yet.')` | **7** | `visit.ts`: `remove(visit, name)` (INV-19). `GreetingScreen.tsx`: the row's remove control (P16), `tabIndex={-1}` + ref + the focus move (P13, P19). One more unit assertion (§5.3) |
| 04 | `04-already-saved-is-refused` | **guard** | same file · same entry point · `toHaveTextContent('Ada is already saved.')` on the region, `getAllByRole('listitem')` to prove exactly one Ada and unchanged order | **5** | **none expected** — the whole `save` command, including this refusal and its copy, arrives at slice 01 (§5.1) |
| 05 | `05-full-list-is-refused` | **guard** | same file · same entry point · five save cycles through the form, `toHaveTextContent('Five names is the limit. Remove one to save another.')`, `queryByText` for its absence at four names, `getByRole('button', { name: 'Remove Bob' })` for the way out | **5** | **none expected** — same reason (§5.1) |
| 06 | `06-name-field-hint-lists-every-saved-name` | **guard** | same file · same entry point · `toHaveAccessibleDescription('Saved: Ada, Bob, Cleo')`, the existing `describedBy(field)` helper for alert-before-hint order, `queryByText('Saved:')` for absence | **5** | **none expected** — `savedNamesHintText` joins the whole list from slice 01 (§5.1). **See §5.5:** one of its five scenarios drives a control this issue does not declare a dependency on |
| 07 | `07-fresh-visit-starts-with-nothing-saved` | **guard** | same file · `render(<GreetingScreen />)` → `unmount()` → `render(<GreetingScreen />)` (the existing `startAFreshVisit` helper) · every absence asserted with `queryBy*`, each Given asserted in full first | **3** | **none expected** — INV-24 is INV-6a (§5.1). Plus the constraint-test exercise path (§4.3) |

Every slice is one sitting: one test file, one component, one module, and each compiles and passes
on its own under `strict` + `noUnusedLocals`.

### 5.1 Which slices are red-first, which are guards, and why

**Red-first: 01, 02, 03.** Each has scenarios that cannot pass until production code changes.

**Guards: 04, 05, 06, 07.** Their scenarios are expected to pass on the first run. That is the
design's intent, not a missing test. **Do not loosen anything to obtain a red bar.** Four guards out
of seven is more than this repo has accepted before, so here is the specific argument for each.

- **04 and 05 are guards because ADR-0007 requires it.** The tempting sequencing is to let slice 01
  append blindly and let 04 add the duplicate rule and 05 the limit. That is ADR-0007's forbidden
  move — a live concept with a branch left wrong — and here it is worse than usual: a visitor on
  slice 01's screen could save Ada twice and get two identical rows carrying two identical
  controls (slice 02), or save six names into a list whose whole point is that it holds five. The
  refusal *messages* arrive with the rules for the same reason: a rule that refuses in silence is
  the failure this codebase has now designed against three times. So the whole `save` command —
  append, already-saved, full, and both sentences — arrives at slice 01, and issues 04 and 05
  ship the scenarios that pin it.
  Their scenarios are **not** tautologies. Each kills a named wrong implementation:
  *already-saved changes nothing* kills an append that does not check membership; *does not
  reorder* kills the move-to-front variant the seed explicitly rejects; *announced through the same
  polite live region* kills a refusal rendered at the Name field (which ADR-0024's ordering would
  then have to describe); *a name not yet saved still succeeds* kills a `save` that refuses whenever
  the list is non-empty; *the sixth is refused* kills a limit that drops the oldest; *four names do
  not trigger it* kills an off-by-one at `>=` vs `>`; *the save control remains* kills hiding it
  when full; *removing frees the slot* kills a limit computed from a counter that removal forgets.
- **06 is a guard because its rule generalises rather than arrives.** The merged hint is
  `Saved: <name>`; the list formatter's one-name case is that same string, so the merged hint
  scenarios keep passing and the joined form is simply what the formatter does with more than one
  name. Building slice 01 with a formatter that shows only *some* of the saved names would be the
  same forbidden move as above (the visitor can see the list; the hint would lie about it), and
  deleting the hint for two slices would be a visible regression to a merged, correct capability.
  Its scenarios still kill: a formatter that joins with `and`, one that sorts, one that shows the
  newest only, one that renders the hint while nothing is saved, and one that describes the field
  hint-before-alert.
- **07 is a guard for the reason ADR-0019 made it one last time.** The only way to make it fail
  first is to park the list somewhere that survives a mount — a module-level `let`, a context, web
  storage — and then move it. ADR-0004 forbids all three, and the state is already in the one
  `useState` that unmounting clears. Its scenarios fail the moment a future change lifts the state
  out of the component, which is the realistic regression.

If a guard scenario **does** go red, the fix is structural, never cosmetic: slice 07 red ⇒ the
visit was lifted out of the component; put it back, never add reset-on-mount logic on top of leaked
state. Slice 04/05/06 red ⇒ one of the wrong implementations named above; fix that, never weaken
the scenario.

**What slice 01 must retire, and what it must merely generalise** — the asymmetry is deliberate
and is the one thing about this feature that surprises a reader:

- **Retired** (its name or its meaning changed): the fixed-name `Greet me again` control, the
  `Saved name` heading, `No name saved yet.`, replacing, `savedNameRegionText`. The greet-again
  control cannot be generalised in place, because a control named `Greet me again` on a screen with
  three saved names cannot say which one it means. It is therefore absent between slice 01 and
  slice 02 — which is exactly why the product brief ships those two together as one walking
  skeleton.
- **Generalised** (same meaning, wider input): the hint, the region's polite live behaviour, the
  save control and its absence before a greeting, the alert-before-hint description order.

### 5.2 Which invariants are live from which slice

Read as *"the slice that introduces it"* — not as an ordering claim. The order slices are built in
is stated in `issues/` and nowhere else (§5.5).

| Invariant | Introduced by | Note |
| --- | --- | --- |
| INV-17, INV-18, INV-20, INV-21, INV-23, INV-25, INV-26, P13, P14, P15, P17, P18, P20, P12 | issue 01 | The whole saving concept, arriving whole (ADR-0007): the list's shape, both refusals, both refusal sentences, the revision counter, the hint's formatter. |
| INV-24 | issue 01, *pinned* by issue 07 | Not new work — INV-6a applied to three new fields (ADR-0026). |
| INV-22, P16 (greet-again half) | issue 02 | Greeting again arrives complete, including its membership guard. |
| INV-19, P16 (remove half), P19 | issue 03 | Removing arrives complete, including its focus rule and its no-op guard. |
| *(none new)* | issues 04, 05, 06, 07 | Guard slices — §5.1. |

### 5.3 The non-DOM tests, named so they are not mistaken for drift

`src/visit.test.ts` is an inner-cycle file (ADR-0003) already home to the INV-6b purity guard and
the counter assertions. This feature adds **four** assertions there, and no others anywhere — no
spies, no snapshots, no `renderHook`:

- **INV-18** (issue 01) — `save(newVisit) === newVisit` by identity. Unreachable through the DOM,
  because P17 keeps the control absent. *(Adjusted from the merged INV-10 assertion.)*
- **INV-21** (issue 01) — a **refused** save advances `savedNamesRevision` while leaving
  `savedNames` unchanged. This is the domain half of R25; the DOM half is a node swap (§5.4) and
  audibility is a human check (VH-04). *(Replaces the merged INV-11 assertion.)*
- **INV-22** (issue 02) — `greetAgain(v, 'Ada') === v` by identity when Ada is not saved.
- **INV-19** (issue 03) — `remove(v, 'Zoe') === v` by identity when Zoe is not saved.

Everything else about this feature is observable through the rendered DOM and belongs in a
scenario.

### 5.4 Seam mechanics — measured, not assumed

Probed in this repo under `npm test -- --run` against a scratch component with the exact markup
shape P13–P19 prescribe (the probe was deleted; these are its results):

| Claim | Result |
| --- | --- |
| A named `<section aria-labelledby>` with `tabIndex={-1}` still resolves as `getByRole('region', { name: 'Saved names' })`, and adding it does not create a second `role="status"`. | Confirmed — `getAllByRole('status')` stays at 1. |
| `savedNamesRegion.current?.focus()` called **in the remove handler**, after `setVisit`, survives the re-render. | Confirmed — `expect(region).toHaveFocus()` passes after `user.click`. No `useEffect`, no `flushSync`, no flag (ADR-0031). |
| `key={name}` on rows means an untouched row keeps its **DOM nodes** across a removal. | Confirmed — the `Greet me again as Ada` button is the *same node object* before and after `Remove Bob`. Focus and identity survive; only the removed row's nodes go. |
| The **same refusal twice** replaces the node when it is keyed by `savedNamesRevision`. | Confirmed — the second `<p>` is a different node and the first is `isConnected === false`. This is the ADR-0009 mechanism, and it is why an identical refusal is not silence. |
| The save control **keeps focus and identity** across a refusal. | Confirmed — it sits outside the keyed node (P12, P14), so React reuses it: `toHaveFocus()` passes and the node is identical. |
| A row's `textContent` is `"AdaGreet me again as AdaRemove Ada"`. | Confirmed — **so row assertions must be substring (`toHaveTextContent('Ada')`) or scoped (`within(row).getByRole(...)`), never an anchored regex.** Same trap the merged suite documents for the region's `<h2>`. Order is asserted by the index of `getAllByRole('listitem')`. |

Two things this seam **cannot** see, unchanged from both merged features: whether a screen reader
actually speaks any of it (VH-04) and whether a real browser reload clears the visit
(`greet-visitor` VH-02). Neither is manufactured into a test that would pass without being true.

### 5.5 The queue, and the one defect this design raises against it

`issues/` owns the slice queue. This design asserts no `Blocked by:` edge, restates none, and
contradicts none.

**Defect raised against the `po` node (high).** Issue 06's third acceptance criterion —
*"The hint updates as names are saved and removed"* — contains the step
`When the visitor activates "Remove Ada"`, and *Remove* is a control that issue 03 introduces.
Issue 06 states no dependency on issue 03 (its own note argues the hint "needs nothing from the row
controls", which is true of the hint's *rule* but not of that scenario's *steps*). This is unlike
the `saved-name` VH-03 case, where the affected step tolerated an absent control because it queried
rather than got: here the step must click a button, so `getByRole('button', { name: 'Remove Ada' })`
throws where the control does not exist, and the lane goes red for a reason outside its own subject.

It is filed as **VH-01** in `.sdlc2/features/remembered-names/VERIFY-WITH-HUMAN.md`, naming
`.sdlc2/features/remembered-names/issues/06-name-field-hint-lists-every-saved-name.md` as the file
to amend, and returned in this node's `disputed`. **The design does not declare the edge**, and the
developer builds whatever `issues/` says: two artifacts of one run asserting different graphs, with
only one of them executable, is the failure SD-07 exists to prevent.

---

## 6. Trade-offs, risks, and what is recorded where

### 6.1 ADR index (this feature)

| ADR | Decision |
| --- | --- |
| [0026](../../../docs/adr/0026-saved-names-list-in-the-visit-aggregate.md) | The saved names are an ordered, bounded list **inside the existing `Visit` aggregate** — the single slot becomes a list, not a second aggregate and not a second hook. |
| [0027](../../../docs/adr/0027-save-has-three-outcomes-refusal-as-data.md) | `save` has **three outcomes**; a refusal is **data** (`SaveRefusal`), not a message parked in state, and one private transition writes list + refusal + revision together. |
| [0028](../../../docs/adr/0028-a-saved-name-is-its-exact-string.md) | A saved name's identity is its **exact string**: no case folding, no Unicode normalisation. |
| [0029](../../../docs/adr/0029-row-commands-address-a-row-by-name.md) | Row commands address a row **by name**, and both guard membership: `greetAgain(visit, name)` (amends ADR-0021) and `remove(visit, name)`. Rows are values; the React key is the name. |
| [0030](../../../docs/adr/0030-every-save-attempt-and-removal-is-perceivable.md) | One monotonic `savedNamesRevision` plus **one keyed node — the refusal** — makes every save attempt and removal renew the region, without re-inserting untouched rows. |
| [0031](../../../docs/adr/0031-removing-moves-focus-and-remove-comes-last.md) | Removing moves focus to the region (`tabIndex={-1}`, imperative, in the handler); saving and greeting again move nothing; the destructive control is **last** in a row. |
| [0032](../../../docs/adr/0032-one-hint-formatter-and-the-retired-region-projection.md) | One formatter (`savedNamesHintText`) owns the `Saved: ` phrasing for the whole list; `savedNameRegionText` is **retired** rather than widened. |
| [0033](../../../docs/adr/0033-remembered-names-acceptance-seam-and-slice-shape.md) | One acceptance seam for all seven slices (`GreetingScreen.test.tsx`), no `App` scenario, no new component; 01–03 red-first, 04–07 guards; the queue stays in `issues/`. |

### 6.2 Known risks, stated rather than mitigated away

1. **Four guard slices out of seven.** A red bar is the cheapest evidence a test can fail, and four
   slices do not get one. §5.1 argues each and names the wrong implementations each guard kills.
   The alternative — manufacturing red by prescribing a worse implementation — is the trade this
   repo has now refused five times.
2. **A live region full of buttons (N9).** Every save inserts a row carrying two named controls
   into a polite live region, so the announcement will include them. The design minimises what is
   inserted and never re-inserts untouched rows, but the verbosity is real and only a human can
   judge it: **VH-04**.
3. **`Visit` now has seven fields.** ADR-0019's tripwire — *split when two fields can change
   independently for reasons that never coincide* — is re-run in ADR-0026 and still not tripped:
   the three list fields change together by construction, and the greeting fields are read or
   written by every list command.
4. **`GreetingScreen.tsx` grows to roughly 130 lines of JSX.** The extraction tripwire is restated
   in §4.2 and ADR-0033 rather than left to drift.
5. **`SAVED_NAMES_LIMIT` and the word "Five" must agree** (§2.5). Not enforced; both live within a
   few lines of each other, and the limit is not configurable by product decision.
6. **`GreetingScreen.test.tsx` passes 80 scenarios** once this feature lands, minus the ~13 it
   retires. Accepted: they share one subject, and splitting by feature would put two files in front
   of one component.

### 6.3 Human checks this design does not close

Recorded in `.sdlc2/features/remembered-names/VERIFY-WITH-HUMAN.md`: **VH-01** (the queue defect
above — a `po` amendment, not a design change), **VH-02** (case sensitivity of "already saved"),
**VH-03** (which refusal wins when the list is full *and* the name is already saved), **VH-04** (the
screen-reader pass over the region, rows and refusals — continuing `saved-name` VH-02/VH-04), and
**VH-05** (the greet-again control is absent between slices 01 and 02, by the product brief's own
pairing).
