# Design — The saved name (`saved-name`)

> Input: `.sdlc2/features/saved-name/feature.md` (seed + product contract), `issues/01..05`,
> `mockup.html`, and `VERIFY-WITH-HUMAN.md` (**VH-01, VH-02** — decisions already taken under
> caveat; honoured here, never relitigated). Existing merged code: `src/visit.ts`,
> `src/GreetingScreen.tsx`, `src/App.tsx`, and the nine ADRs of `greet-visitor`
> (`docs/adr/0001`–`0009`). Output consumed by the `developer` node.
>
> This document designs the **domain model, the boundaries, the contracts, and the outer
> acceptance-test seam for each of the five slices**. It changes no acceptance criterion, no
> issue, no line of `feature.md` and no line of `mockup.html`.
>
> **Where each VH record lands here:** VH-01 §2.5, §4.1 (`savedNameText` is the single place the
> `Saved: <name>` phrasing exists, so the region and the hint cannot drift apart, and one edit
> changes both if a human prefers other copy) · VH-02 §2.4 P7, §4.2, §5.4, ADR-0022, ADR-0023
> (the region carries `aria-live="polite"` and **never** `role="status"`; the re-announcement
> mechanism is `saveCount` + a keyed child, measured in §5.4; audibility stays a human check).
>
> **ADR numbering starts at 0019, not 0010.** `docs/adr/0010`–`0018` are already written and
> already claim those filenames on the unmerged `slice/greeting-log/*` branches (a concurrent,
> separate feature — see `feature.md` Out of scope). Reusing them here would produce two
> ADR-0010s that git merges **without a conflict**, because the slugs differ. The gap on `main`
> is the cheaper of the two costs, and it closes the moment `greeting-log` merges. See §6.

---

## 1. Problem understanding

### 1.1 What already exists (and is not redesigned here)

`greet-visitor` is merged. `src/visit.ts` holds one aggregate — `Visit` — with one command
(`submit`) and two projections (`greetingText`, `alertText`), plus two monotonic counters
(`greetingCount`, `blankCount`) that make every submission perceivable (ADR-0009). The screen is
one component, `src/GreetingScreen.tsx`, holding two `useState` hooks that die at unmount
(ADR-0004). This feature **extends that aggregate and that component**. It introduces no new
layer, no new dependency, no new test stack and — deliberately — no new component (§4.2,
ADR-0025).

### 1.2 Functional requirements (from the product contract, restated as rules)

Numbering continues `greet-visitor`'s R1–R9 so that a rule id means one thing across the repo.

| # | Rule | Source |
| --- | --- | --- |
| R10 | The visit holds **at most one** saved name. It is captured from **the greeting currently on screen** — never from the Name field — by an explicit act of the visitor. | Seed *Agreed scope*, *Decisions*; Story 1 |
| R11 | There is nothing to save until there has been a greeting, so the save control **does not exist** before the first greeting — absent from the DOM, not present-and-disabled. | Seed *Agreed scope*, *Decisions*; Story 1 |
| R12 | Saving again **replaces**, silently: no confirmation, no undo, no warning. | Seed *Decisions*; Story 4 |
| R13 | **Greeting again is an ordinary greeting**: the one existing state transition with the saved name substituted for the field's draft. The status region updates, a standing blank-name alert clears, the Name field's draft is untouched, and the saved name does not change. | Seed *Decisions*; Story 2 |
| R14 | The saved name is shown in **two** places: the Saved name region, and the Name field's **accessible description** (the hint). When a blank-name alert is also present, the field is described by **both, alert first**. | Seed *Agreed scope*; Stories 1, 3 |
| R15 | **Every save is perceivable.** The Saved name region is a polite live region whose content is renewed by each save — including a save of the name already saved. Saving moves no focus. | Seed *Agreed scope*, *Decisions*; VH-02 |
| R16 | Blank submissions and greeting-again **never touch** the saved name; a **fresh visit** has nothing saved, no save control, no greet-again control and no hint. | Seed *Agreed scope*; Stories 1, 2, 5 |
| R17 | Both controls sit **inside the Saved name region and outside the `<form>`**, so Enter in the Name field still greets from the field exactly as it does today. | Seed *Agreed scope*, *Decisions*; Story 1 |

### 1.3 Non-functional / cross-cutting requirements

Numbering continues N1–N6.

| # | Requirement | Consequence for this design |
| --- | --- | --- |
| N7 | The new region must be **announced** without disturbing what `greet-visitor` already announces: a save must not re-announce the greeting, and a greeting must not re-announce the save. | P7/P8 + INV-11. Measured, not assumed (§5.4): a save produces 2 mutations in the Saved name region and **0** in the status region; a greet-again produces 2 in the status region and **0** in the Saved name region. |
| N8 | **No regression in the merged suite.** `src/GreetingScreen.test.tsx` contains **17 bare `getByRole('status')` calls** and two exact assertions on the Name field's `aria-describedby` (`toHaveAttribute('aria-describedby', alert.id)`, and `not.toHaveAttribute('aria-describedby')`). Both are load-bearing constraints on this design, not preferences. | The new region carries **no** `role="status"` (VH-02, ADR-0022), and the field's `aria-describedby` must equal **exactly** the alert id when nothing is saved and be **absent** when neither element is present (§4.3, ADR-0024). |
| N9 | Nothing is stored, transmitted or remembered — extended to the saved name. | No new port (ADR-0006 stands unchanged, §3). `savedName` is a field of `Visit`, so INV-6a covers its lifetime with **no new lifetime invariant and no reset logic** (ADR-0019). The existing `never writes to web storage` constraint test and the INV-6b lexical purity guard both keep working unchanged. |
| N10 | Every slice must typecheck standalone under `strict` + `noUnusedLocals` and pass `npm test -- --run`; build is `npm run build`. | §5.2 says which invariant is live when; §4.1's `submit` amendment is **compiler-enforced** (its non-blank branch is an exhaustive object literal, so omitting the two new fields is a type error). |

### 1.4 Explicit non-goals

Persistence of any kind, more than one saved name (that is `greeting-log`, a separate feature on
unmerged branches), unsaving, editing the saved name in place, saving a name never greeted,
copying the saved name into the Name field, confirming/warning/undoing a replace, counting or
timestamping saves, i18n, styling. All carried from `feature.md`'s Out of scope; none is
implemented, and none is designed for "later" with a speculative seam.

---

## 2. Domain model

### 2.1 Bounded context

**Still one context: `Greeting`.** The saved name is not a second context: it has no independent
lifecycle, no identity, no rules that could be true while the greeting's rules are false, and
every one of its transitions reads or writes a fact the `Greeting` context already owns. The app
shell (`App`, `AppBanner`, `main.tsx`) remains a composition root that knows none of these rules.

There is **no integration and no anti-corruption layer** anywhere in this feature, because there
is nothing to integrate with.

### 2.2 Ubiquitous language → code names

Every seed/contract term that this feature adds has a row. Nothing is renamed on the way in.

| Term (seed / contract) | Code name | Kind |
| --- | --- | --- |
| **Saved name** — the one name the visit is holding onto | `savedName: string \| null` (a field of `Visit`; `null` until the first save) | Value (aggregate state) |
| **Nothing saved** — before the first save, and on a fresh visit | `savedName === null`, rendered as `NOTHING_SAVED_MESSAGE` | State |
| **Saving** — capturing the name currently being greeted | `save(visit): Visit` — a domain command taking **no name argument** (ADR-0020) | Command |
| **Replacing** — saving while a name is already saved | *no separate operation*: `save` writes the whole slot, so replacing is what saving does when the slot is full (ADR-0019, R12) | — |
| **Greeting again** — being greeted as the saved name | `greetAgain(visit): Visit`, whose body is `submit(visit, visit.savedName)` (ADR-0021) | Command (composed) |
| **Saved name** — *how many times this visit has saved* (so an identical replace is still a distinct save — R15) | `saveCount: number` (monotonic; identity, never displayed) | Value (aggregate state) |
| **Saved-name hint** — the description at the Name field | `savedNameText(visit): string \| null` (`Saved: <name>` / `null`) | Derived value |
| **Saved name region** — its words | `savedNameRegionText(visit): string` (`Saved: <name>` / the empty state) | Derived value |
| Empty-state copy | `NOTHING_SAVED_MESSAGE = 'No name saved yet.'` | Constant |
| **Save control** / **Greet-again control** | JSX nodes in `GreetingScreen`, named there and nowhere else (ADR-0003 stands: no role, id or `aria-*` name appears in `visit.ts`) | Driving adapter detail |

Terms carried over unchanged — **Visitor, Name, Greeting, Blank name, Trimmed, Fresh visit,
Status region, Alert** — keep exactly their `greet-visitor` meanings and their existing code
names. In particular **Fresh visit** is still "one mount of `GreetingScreen`" (VH-02 of
`greet-visitor`), which is why Story 5 needs no new mechanism.

### 2.3 The aggregate, extended

```
Aggregate root: Visit      (in-memory, per mount, no identity, no persistence)
  state
    greetedName            : string | null    -- unchanged (INV-2)
    greetingCount          : number           -- unchanged (INV-8a)
    lastSubmissionWasBlank : boolean          -- unchanged (INV-5a)
    blankCount             : number           -- unchanged (INV-8b)
    savedName              : string | null    -- NEW. null on a fresh visit          (INV-9)
    saveCount              : number           -- NEW. 0 on a fresh visit             (INV-11)
  commands
    submit(rawName)                            -- unchanged transition; now also carries
                                                  savedName/saveCount through untouched (INV-13)
    save()                                     -- NEW. captures greetedName into savedName
    greetAgain()                               -- NEW. delegates to submit(savedName)
  projections (pure reads, no state)
    greetingText()          -> unchanged
    alertText()             -> unchanged
    savedNameText()         -> null | `Saved: ${savedName}`                          (INV-15)
    savedNameRegionText()   -> savedNameText() ?? 'No name saved yet.'               (INV-16)
```

**Still exactly one aggregate, and that is the load-bearing decision.** `save` **reads**
`greetedName` and **writes** `savedName` in the same operation. If the saved name lived in a
second aggregate (a `SavedName`, a `Bookmark`, a separate `useState`), that single visitor action
would become a read of aggregate A followed by a write to aggregate B, which has to be atomic to
be correct — the textbook cross-aggregate transaction, with the component playing coordinator.
Keeping `savedName` inside `Visit` means **no operation in this feature spans two aggregates**,
because there is still only one. `greetAgain` is the mirror image: it reads `savedName` and drives
`submit`, which writes `greetedName`. Two operations, both read-then-write across the same two
fields, both structurally impossible to get half-done. ADR-0019 records the alternatives.

**Entities.** Still none. **Domain events.** Still none — ADR-0006 stands unamended: nothing
subscribes, the "announcement" is an ARIA live region and not a bus, and this feature adds no
driven side. **Value objects.** `savedName` is a plain `string`, and deliberately not a new
branded type: it is *by construction* a value `greetedName` already held, so it inherits INV-2's
"trimmed and non-blank" guarantee without re-deriving or re-validating it (ADR-0020).

### 2.4 Invariants and their owners

Every invariant names **exactly one enforcement point** — one function or one component a reader
can open. Where a rule has two halves with two natural owners, it is split so each half still has
one owner (the house rule from `greet-visitor` §2.4). Nothing here is enforced only by a test, and
nothing is enforced only by the absence of a button.

| ID | Invariant | Single owner | How it is enforced there |
| --- | --- | --- | --- |
| INV-9 | **The saved name is whatever the visit was greeted as at the moment of saving, and there is at most one.** `savedName` is written **only** by `save`, which assigns `visit.greetedName` verbatim. It is `null` on a fresh visit and non-null forever after the first save (nothing empties it — there is no unsave). | `save` in `src/visit.ts` | `save` is the sole writer; it copies one field to another with no formatting, no trimming, no re-derivation. "At most one" is structural: `savedName` is a scalar slot, not a collection, so `save` overwrites — **replacing is not a second code path** (R12, ADR-0019). Because the value comes from `greetedName`, INV-2 ("trimmed, non-blank") holds for it without a second rule. |
| INV-10 | **`save` is total: with no greeting there is nothing to save, and calling it changes nothing.** `greetedName === null` ⇒ `save(visit) === visit`, by identity. | `save` in `src/visit.ts` | One guard clause returning the input value. This is the *enforcement* of R11; P6 (the control's absence) is the **affordance**, not the rule. Stating it here is what stops the rule from living in a `{cond && <button/>}` in the component, where a second future caller would miss it. Unit-asserted in `src/visit.test.ts` (§5.3) because no scenario can reach it through the DOM. |
| INV-11 | **Every save is a new save**, even when the name is identical: `saveCount` is incremented by `save`'s writing branch and changed nowhere else, ever. Monotonic per visit; reset only by `newVisit`. | `save` in `src/visit.ts` | The same mechanism ADR-0009 established for `greetingCount`/`blankCount`, applied to the third live region (R15, VH-02(c)). The no-op branch (INV-10) does **not** increment — a save that did nothing is not a save. Never branched on, never compared, never rendered as text; the component reads it only as a React `key` (P8). |
| INV-12 | **Greeting again is the same greeting.** `greetAgain(visit)` is `submit(visit, visit.savedName)` when a name is saved, and the identity function when none is. There is **no second transition**: nothing about greeting, alert-clearing or counting is re-implemented. | `greetAgain` in `src/visit.ts` | The body delegates to `submit` and does nothing else, so R13's four consequences (status renewed, alert cleared, draft untouched, `greetingCount` advanced) are inherited rather than restated. `savedName` is non-blank by INV-9, so `submit` always takes its non-blank branch — "greeting again clears a standing alert" needs no rule of its own. |
| INV-13 | **Nothing but `save` writes `savedName`, and nothing but `save` writes `saveCount`.** In particular `submit` carries both through unchanged on **both** branches, so a blank submission never touches the saved name (R16) and greeting again never re-saves (R13). | `submit` in `src/visit.ts` | The blank branch is a spread (`{ ...visit, … }`) and carries them for free. The non-blank branch is an exhaustive object literal, so the two new fields must be listed — **omitting them is a `tsc` error**, not a silent bug. That asymmetry is the same one ADR-0009 relies on, and it is why this invariant is compiler-checked rather than review-checked. |
| INV-14 | **The saved name's lifetime is exactly one mount of `GreetingScreen`** — it begins `null` and ends when the component unmounts. | `GreetingScreen`, via INV-6a | **This invariant is deliberately not new work.** `savedName` and `saveCount` are fields of `Visit`, and INV-6a already pins `Visit` to one `useState` inside the component. There is nothing extra to enforce and no reset logic to get wrong; Story 5 passes by construction. This row exists so the reader can see that R16's fresh-visit half has an owner, and that the owner is one already in place (ADR-0019's decisive consequence). |
| INV-15 | Hint text is `Saved: ${savedName}` when a name is saved and `null` when none is. **This is the only place the `Saved: ` phrasing exists.** | `savedNameText` in `src/visit.ts` | One formatter, two consumers (the hint element and, via INV-16, the region). VH-01 decided the region and the hint show the *same string*; this makes that structural rather than a convention two JSX nodes have to keep agreeing on, and gives VH-01 exactly **one** edit site if a human prefers different copy. |
| INV-16 | The Saved name region's words are the saved name if there is one, and `NOTHING_SAVED_MESSAGE` otherwise. The function is **total** — the region is always present (P7) so it always has words. | `savedNameRegionText` in `src/visit.ts` | `savedNameText(visit) ?? NOTHING_SAVED_MESSAGE`. It composes rather than forwards: it owns the empty-state decision, which is a rule, and it is the reason no component ever types either string. (Contrast the wrapper ADR-0009 forbids, whose whole body was `return visit.greetingCount` — that one did no work.) |

Presentation invariants (owned by `GreetingScreen`, and by nothing else — the domain still knows
nothing of ARIA, roles, ids or element shape):

| ID | Invariant | Enforced by |
| --- | --- | --- |
| P6 | The **save control** is rendered **iff** `visit.greetedName !== null`, and is absent from the DOM otherwise — never rendered disabled. | One `{visit.greetedName !== null && <button type="button" …>Save this name</button>}` inside the region. It is the affordance for INV-10, never the enforcement of it. |
| P7 | The **Saved name region** is rendered on **every** render from first mount, as `<section aria-labelledby={SAVED_NAME_HEADING_ID} aria-live="polite">` containing a visible `<h2 id={SAVED_NAME_HEADING_ID}>Saved name</h2>`, positioned **after** the status region. It carries `aria-live="polite"` **from the first render**, and it **never** carries `role="status"`. | Unconditional JSX, never inside a `{cond && …}` — the live region must be observed before its text arrives (the VH-04 lesson from `greet-visitor`, applied to the third region). `role="region"` is the implicit role of a named `<section>`: the accessible name comes from the visible heading via `aria-labelledby`, so the heading the seed requires and the name the tests query are the **same** DOM node (ADR-0022). No `role="status"` — N8/VH-02. |
| P8 | The region's words live in **one keyed child**, `<span key={visit.saveCount}>`, so an identical replace still replaces the node, while the `<section>` and its `<h2>` keep their identity. | `<p><span key={visit.saveCount}>{savedNameRegionText(visit)}</span></p>`. The key is read from the aggregate and never computed in the component — INV-11 is what makes it change. Measured in §5.4. |
| P9 | The **saved-name hint** element is rendered **iff** `savedNameText(visit) !== null`, is **visible**, sits beside the Name field, and carries `SAVED_NAME_HINT_ID`. | One `{savedNameHint !== null && <p id={SAVED_NAME_HINT_ID}>{savedNameHint}</p>}`, evaluated from the same one expression P10 reads, so the two cannot disagree. Visible, not `aria-label`/visually-hidden: the seed says *visible text ... programmatically associated*, and issue 03 asserts both halves. |
| P10 | The Name field's `aria-describedby` is the **ordered** list of the ids whose elements are present — **alert first, hint second** — and the attribute is **absent entirely** when neither is. **Supersedes P3.** | One computed value: `[alert !== null ? ALERT_ID : null, savedNameHint !== null ? SAVED_NAME_HINT_ID : null].filter(id => id !== null).join(' ')`, passed as `undefined` when empty. Order in the attribute *is* the order the description is read in (verified, §5.4). P2/P9's element conditions and this list read the same two expressions (ADR-0024). |
| P11 | The **greet-again control** is rendered **iff** `visit.savedName !== null`, inside the region, and is absent otherwise. | One `{visit.savedName !== null && <button type="button" …>Greet me again</button>}`. |
| P12 | **Both controls are `type="button"` and sit inside the region, which is outside the `<form>`**; neither control's JSX node is inside the keyed child of P8, and neither carries a changing `key`. | Two consequences follow, and both are asserted: activating either control cannot submit the form (R17), and **the save control survives its own activation with focus intact** (R15) — React reuses the same DOM node, so no focus move and no focus loss. Measured in §5.4. |

> **What is *not* an invariant here, on purpose.** There is no rule that the hint and the region
> agree, because they read the same projection (INV-15). There is no rule that a save leaves the
> greeting alone, because `save` does not touch `greetedName` and could not. There is no
> "at most one saved name" runtime check, because the type is a scalar. Each of those would be an
> invariant with no possible violation — cost with no work.

### 2.5 Where visitor-facing text lives

Unchanged from `greet-visitor` §2.5, extended consistently: the domain module owns the **messages**
(`Saved: ` inside `savedNameText`, `NOTHING_SAVED_MESSAGE`), because they are rule output; the
component owns **element shape and labels** (`'Save this name'`, `'Greet me again'`, the heading
`'Saved name'`, roles, ids, `aria-*`). Consequence, so VH-01 has one known edit site: the region's
and the hint's shared string is `savedNameText` in `src/visit.ts`; the empty state is
`NOTHING_SAVED_MESSAGE` beside it; the two control names and the heading are three JSX nodes in
`GreetingScreen.tsx`. Control names are **fixed** and never interpolate the saved name (seed
*Decisions*) — no scenario has to interpolate a query, and one control stays one thing to assistive
technology for the whole visit.

---

## 3. Architecture

```
  ┌─────────────────────────── app shell (composition root) ────────────────────────────┐
  │  index.html → src/main.tsx → src/App.tsx      UNCHANGED BY THIS FEATURE              │
  │     <main> <AppBanner/>  <GreetingScreen/> </main>                                  │
  └──────────────────────────────────┬──────────────────────────────────────────────────┘
                                     │ renders
  ┌──────────────────────────────────▼──────────────── driving adapter (transport) ─────┐
  │  src/GreetingScreen.tsx        still TWO hooks, both component-local (INV-6a/6c)     │
  │    useState rawName : string                                                        │
  │    useState visit   : Visit      ← now also holds savedName + saveCount (INV-14)     │
  │                                                                                     │
  │    <form>  onSubmit → setVisit(v => submit(v, rawName))        [unchanged]           │
  │      Name field   aria-describedby = [ALERT_ID?, HINT_ID?]     (P10, supersedes P3)  │
  │      alert        role="alert"  keyed by blankCount            (P2/P5 unchanged)     │
  │      hint         iff savedNameText !== null, visible          (P9)     ── NEW       │
  │    </form>                                                                          │
  │    <p role="status"> keyed by greetingCount                    (P1/P4 unchanged)     │
  │    <section aria-labelledby aria-live="polite">                (P7)     ── NEW       │
  │      <h2>Saved name</h2>                                                            │
  │      <p><span key={saveCount}>{savedNameRegionText(visit)}</span></p>   (P8)         │
  │      [Save this name]   iff greetedName !== null  → setVisit(save)      (P6, P12)    │
  │      [Greet me again]   iff savedName   !== null  → setVisit(greetAgain)(P11, P12)   │
  │    </section>                                                                       │
  └──────────────────────────────────┬──────────────────────────────────────────────────┘
                                     │ calls (one-way: the domain imports nothing)
  ┌──────────────────────────────────▼──────────────── domain (pure) ───────────────────┐
  │  src/visit.ts     no React · no DOM · no I/O · no module-level mutable state         │
  │    newVisit · submit · greetingText · alertText · isBlank · ALERT_MESSAGE            │
  │    save · greetAgain · savedNameText · savedNameRegionText · NOTHING_SAVED_MESSAGE   │
  └─────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                        (still no driven ports — ADR-0006 unamended)
```

**Ports and adapters, stated plainly.** There is exactly **one port in this feature and it is a
driving one**: the module surface of `src/visit.ts` (§4.1), which `GreetingScreen` is the only
adapter for. There is **no driven port** — no repository, no store, no clock, no event bus, no
i18n — and ADR-0006 already records where each would attach if it ever earned its keep. This
feature adds nothing to that list, because "in memory only, dies with the visit" is a *requirement*
here, not a limitation to be abstracted away.

**Data flow — saving**

```
visitor activates "Save this name"        (a button, type="button", outside the <form>)
      │
      ▼
setVisit(save)  ──► save(visit)                       pure, synchronous, total
                       │
                       ├─ greetedName === null ─► visit                (identity — INV-10)
                       └─ otherwise ────────────► { ...visit,
                                                    savedName: visit.greetedName,   (INV-9)
                                                    saveCount: visit.saveCount + 1 } (INV-11)
      ▼
re-render ──► savedNameRegionText(next) → the region's keyed child, re-keyed  (P8) → announced
              savedNameText(next)       → the hint element + describedby      (P9/P10)
              greetingText(next)        → UNCHANGED value, UNCHANGED key ⇒ no DOM write,
                                          so the status region is not re-announced   (N7)
```

**Data flow — greeting again**

```
visitor activates "Greet me again"
      │
      ▼
setVisit(greetAgain) ──► greetAgain(visit)
                            │
                            ├─ savedName === null ─► visit             (identity — INV-12)
                            └─ otherwise ──────────► submit(visit, visit.savedName)
                                                        ⇒ greetedName := savedName
                                                        ⇒ greetingCount + 1      (INV-8a)
                                                        ⇒ lastSubmissionWasBlank := false
                                                        ⇒ blankCount, savedName, saveCount
                                                          carried through        (INV-13)
      ▼
re-render ──► status region re-keyed ⇒ re-announced, even for the same name
              alert element removed  ⇒ a standing blank-name alert clears
              rawName untouched      ⇒ the visitor's draft survives
              region + hint untouched ⇒ the save is not re-announced        (N7)
```

Everything remains **one synchronous pure transition per visitor action**: no async work, no
effect, no cleanup, no ordering or retry concern. Idempotency is unchanged in character from
ADR-0009 and worth restating because it is counter-intuitive: `save` is deliberately **not**
value-idempotent — saving the same name twice returns a *different* `Visit` (`saveCount` advances)
— and that non-idempotence is exactly what makes the second save audible (§5.4). What *is*
idempotent, and must stay so, is the rendering: given a `Visit`, the DOM is a pure function of it.

**Where this design deliberately stops.** No `useReducer`, no `useVisit` hook, no context, no
store, no `SavedNameRegion` component, no `src/domain/` tree, no new file at all. Each would add a
layer whose only inhabitant is a four-line function or a JSX fragment with one caller — ADR-0003,
ADR-0004, ADR-0025.

---

## 4. Contracts

### 4.1 Domain module — `src/visit.ts` (the one port the UI depends on)

End state, after slice 03. §5.2 says what is live when; nothing is sequenced *within* an invariant
(ADR-0007 stands). Additions only — no existing export changes its signature.

```ts
/** Fixed empty-state copy (seed, Agreed copy). */
export const NOTHING_SAVED_MESSAGE = 'No name saved yet.'

export type Visit = {
  readonly greetedName: string | null
  readonly greetingCount: number
  readonly lastSubmissionWasBlank: boolean
  readonly blankCount: number
  /** INV-9. The one name this visit is holding onto; null until the first save.
   *  Trimmed and non-blank when present — it is a value greetedName already held. */
  readonly savedName: string | null
  /** INV-11. Saves performed this visit. Monotonic; identity, not a quantity to display. */
  readonly saveCount: number
}

export const newVisit: Visit = {
  greetedName: null,
  greetingCount: 0,
  lastSubmissionWasBlank: false,
  blankCount: 0,
  savedName: null,
  saveCount: 0,
}

/**
 * INV-9, INV-10, INV-11. Captures the name the visitor is currently greeted as.
 * Takes NO name argument: the greeting is the only possible source (ADR-0020).
 * Total — a no-op when there is no greeting. Replacing is what this does when the slot is full.
 */
export function save(visit: Visit): Visit {
  if (visit.greetedName === null) return visit
  return { ...visit, savedName: visit.greetedName, saveCount: visit.saveCount + 1 }
}

/**
 * INV-12. An ordinary greeting with the saved name substituted for the field's draft.
 * Delegates to submit and does nothing else, so re-announcement, alert-clearing and the
 * untouched draft are inherited, not restated (ADR-0021). No-op when nothing is saved.
 */
export function greetAgain(visit: Visit): Visit {
  if (visit.savedName === null) return visit
  return submit(visit, visit.savedName)
}

/** INV-15. The one place the `Saved: ` phrasing exists. null ⇒ the hint element is absent (P9). */
export function savedNameText(visit: Visit): string | null {
  return visit.savedName === null ? null : `Saved: ${visit.savedName}`
}

/** INV-16. The Saved name region's words. Total — the region is always present (P7). */
export function savedNameRegionText(visit: Visit): string {
  return savedNameText(visit) ?? NOTHING_SAVED_MESSAGE
}
```

`submit` is amended by two carried fields and by nothing else (INV-13):

```ts
export function submit(visit: Visit, rawName: string): Visit {
  if (isBlank(rawName)) {
    return { ...visit, lastSubmissionWasBlank: true, blankCount: visit.blankCount + 1 }
    //       ^ savedName and saveCount ride the spread — a blank submission cannot touch them
  }
  return {
    greetedName: rawName.trim(),
    greetingCount: visit.greetingCount + 1,
    lastSubmissionWasBlank: false,
    blankCount: visit.blankCount,
    savedName: visit.savedName,     // NEW — omitting it is a tsc error, not a silent bug
    saveCount: visit.saveCount,     // NEW — likewise
  }
}
```

Contract notes the developer must not drift from:

- **`save` takes one argument and it is the visit.** Do not add a `name`/`rawName` parameter "for
  symmetry with `submit`". The absent parameter *is* the guarantee that the draft can never be
  captured (ADR-0020); with it, Story 1's *"captures the greeting, never an untyped draft"*
  becomes a rule someone has to remember instead of a shape nobody can violate.
- **`greetAgain` must call `submit`.** Do not inline `{ ...visit, greetedName: visit.savedName, … }`
  — that is the "second, subtly different notion of a greeting" the seed rejects by name, and it
  is how a stale alert ends up sitting under a fresh greeting (ADR-0021, and ADR-0001's motivating
  symptom).
- **`saveCount` is never displayed, never compared, never branched on**, and gets no wrapper
  projection (`savedRevision(visit)` and friends are the abstraction ADR-0009 forbids). The
  component reads it only as a React `key`.
- **Do not short-circuit an identical save** (`if (visit.savedName === visit.greetedName) return visit`).
  It looks like a harmless optimisation and it is precisely the defect: `saveCount` would freeze,
  the keyed child would not be replaced, and the seed's *"saving the same name a second time
  announces again rather than falling silent"* would be silently false. §5.4 measures the
  difference; Story 4's third scenario is the guard.
- No id, role, class name or `aria-*` attribute name appears in this module (ADR-0003). The module
  still imports nothing and touches no ambient global, so the INV-6b lexical purity guard in
  `src/visit.test.ts` keeps passing unmodified.

### 4.2 Component contract — `src/GreetingScreen.tsx`

No props, no new component, no new file (ADR-0025). Three new constants beside the existing two:

```ts
const SAVED_NAME_HEADING_ID = 'saved-name-heading'
const SAVED_NAME_HINT_ID = 'saved-name-hint'
```

Rendered DOM contract — the vocabulary every acceptance test in this feature binds to (existing
rows from `greet-visitor` §4.2 unchanged and not repeated):

| Element | Query used by tests | Fixed by |
| --- | --- | --- |
| Saved name region | `getByRole('region', { name: 'Saved name' })` — **always present**; `toHaveAttribute('aria-live', 'polite')`; text via `toHaveTextContent(...)` | contract "Saved name region"; P7 |
| Region heading | the same element's accessible name, sourced from the visible `<h2>Saved name</h2>` via `aria-labelledby` | seed "headed 'Saved name'"; ADR-0022 |
| Save control | `within(region).getByRole('button', { name: 'Save this name' })`; absence via `screen.queryByRole('button', { name: 'Save this name' })` → `null` | contract "Save control"; P6 |
| Greet-again control | `within(region).getByRole('button', { name: 'Greet me again' })`; absence likewise | contract "Greet-again control"; P11 |
| Saved-name hint | `getByRole('textbox', { name: 'Name' })` → `toHaveAccessibleDescription('Saved: Ada')`; **visibility** via the element the field is described by (§5, mechanics) | contract "Saved-name hint"; P9/P10 |
| Region ordering | `status.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING` | Story 1's *"appears after the status region"*; P7 |
| Keyed child | **no query of its own** — invisible to every scenario | R15, P8 (§5.4) |

**Why the region is not its own component.** `SavedNameRegion` would need `visit` plus two
callbacks passed down; it would own no state and no rule; and `CLAUDE.md` requires every component
to have a sibling `*.test.tsx`, so the extraction would either create a second test file
duplicating the same scenarios or leave a component without one. The honest tripwire, so this is a
decision rather than an omission: **extract when a second screen needs the region, or when
`GreetingScreen.tsx` acquires a third piece of state that no other part of it reads.** Neither is
true after slice 05. Recorded in ADR-0025.

### 4.3 Backwards compatibility with the merged `greet-visitor` suite

These are constraints, not notes; each was checked against the merged test file.

| Merged assertion | Why it survives |
| --- | --- |
| 17 × bare `getByRole('status')` | The new region is a `<section>` with role **region**, never `role="status"` (VH-02, ADR-0022). A second `status` would make all 17 throw on "multiple elements". |
| `getByRole('heading', { name: 'sdlc2 lab' })` (×3) | Name-scoped, so the new `<h2>Saved name</h2>` cannot make it ambiguous. |
| `toHaveAttribute('aria-describedby', alert.id)` (×2) | In those scenarios nothing is saved, so P10's list has exactly one member and the attribute string is exactly `alert.id`. |
| `not.toHaveAttribute('aria-describedby')` + `toHaveAccessibleDescription('')` (×2) | P10 passes `undefined` when the list is empty — the attribute is removed, never emptied. An empty `aria-describedby` is a dangling reference and would fail these. |
| `never writes to web storage` constraint test | Unchanged: no new state leaves the component, no new module, no new global. |
| INV-6b lexical purity guard in `src/visit.test.ts` | Unchanged: the four new exports import nothing and reference no ambient global. |
| `App.test.tsx` contains exactly one `it` (ADR-0005's duplication tripwire) | This feature adds **no** scenario there (ADR-0025). |

---

## 5. The seam — per slice

**Seam family (all five slices):** the project's declared frontend seam —
`React Testing Library + user-event via Vitest (jsdom)` — driving the rendered DOM by role and
accessible name. **Every one of the 27 scenarios is driven through it**; no slice introduces a
different kind of acceptance test, and no slice needs the backend seam (there is none:
`seam.backend: ""`). Run with `npm test -- --run`; typecheck with `npm run build`.

**One entry point for this whole feature: `render(<GreetingScreen />)`**, in
`src/GreetingScreen.test.tsx`. `greet-visitor` also used `render(<App />)` for its one composition
scenario; this feature adds **no** scenario there, because no acceptance criterion in it mentions
the app shell, and ADR-0005's duplication tripwire says a second `it` in `App.test.tsx` is the
signal that the suite has begun duplicating itself. The composition is already pinned by that
existing scenario; nothing this feature adds can un-wire `<GreetingScreen/>` from `<App/>`
(ADR-0025). `GreetingScreen` is also the mount whose unmount/remount **is** a fresh visit
(`greet-visitor` VH-02), which is what slice 05 needs.

| Slice | Issue | Kind | Outer seam (file · entry point) | Scenarios driven | Production change |
| --- | --- | --- | --- | --- | --- |
| 01 | `01-save-the-greeted-name` | **red-first** | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | all **9**: region present & empty before any greeting (+ ordering, + `aria-live`) · save control appears only after a greeting · blank submission does not summon it · saving captures the greeting · saving does not move focus · captures the greeting not the draft · blank submission never touches the saved name · save control does not submit the form · Enter still greets from the field | `visit.ts`: `savedName`, `saveCount`, `save`, `savedNameText`, `savedNameRegionText`, `NOTHING_SAVED_MESSAGE`, and `submit`'s two carried fields (INV-9…INV-11, INV-13, INV-15, INV-16). `GreetingScreen.tsx`: the region (P7), its keyed child (P8), the save control (P6, P12). Plus the two named non-DOM assertions in `src/visit.test.ts` (§5.3) |
| 02 | `02-greet-again-as-the-saved-name` | **red-first** | same file · `render(<GreetingScreen />)` | all **8**: control absent while nothing saved · appears once saved · greets as the saved name not the draft · works when the greeting already matches · clears a standing alert · leaves the draft untouched · does not change the saved name · does not submit the form | `visit.ts`: `greetAgain` (INV-12). `GreetingScreen.tsx`: the greet-again control (P11, P12). One more `visit.test.ts` assertion (§5.3) |
| 03 | `03-be-reminded-of-the-saved-name` | **red-first** | same file · `render(<GreetingScreen />)` | all **5**: no description while nothing saved · description appears once saved (+ described element visible) · survives mid-draft typing · updates on replace · alert first when both are present | `GreetingScreen.tsx` only: the hint element (P9) and the ordered `aria-describedby` list (P10, superseding P3). **No domain change** — `savedNameText` already exists from slice 01 |
| 04 | `04-replace-the-saved-name` | **guard slice** | same file · `render(<GreetingScreen />)` | all **3**: saving again replaces · replacing asks nothing and offers no way back · saving the same name again still replaces, focus retained | **none expected** — INV-9/INV-11 arrived whole at slice 01 (§5.1). See the **build-order note** below: this slice's second scenario needs slice 02's control to exist |
| 05 | `05-fresh-visit-clears-the-saved-name` | **guard slice** | same file · `render(<GreetingScreen />)` → `unmount()` → `render(<GreetingScreen />)` | both: fresh visit after saving · fresh visit after greeting again | **none expected** — INV-14 is INV-6a, already in place (§5.1, ADR-0019) |

**Build-order note for slice 04 (a real hazard, not a preference).** Issue 04 declares
`Blocked by: 01` only, and its subject genuinely is slice 01's. But one of its steps —
*"the only buttons inside the Saved name region are 'Save this name' and 'Greet me again'"* —
names a control that does not exist until slice 02 ships. In a serial run (01→02→03→04→05) this is
invisible. In a **parallel lane run**, where 02/03/04 all unblock together off 01, slice 04's lane
would go red for a reason outside its own subject. The design therefore declares slice 04's
effective build order as **after 02**, and does not touch issue 04's acceptance criteria.
Recorded for the human as **VH-03** and reflected in this node's `slices[].blockedBy`.

> **SUPERSEDED (2026-08-23, VH-03).** The hazard above was refuted by the run that followed it.
> Slices 02, 03 and 04 unblocked together off 01 and their developers started in the same second
> (23:02:48) in three separate worktrees; **slice 04 passed on attempt 1**, review 0.94, while
> slice 02 was still building. Slice 04's closed-list assertion tolerates the absent control by
> construction — it uses `queryAllByRole`, which returns `[]` rather than throwing — so the loop
> is a no-op until slice 02 lands and still catches a confirmation dialog, an undo control, or any
> third button. **Do not act on the build-order constraint in this section.** Issue 04's
> `Blocked by: 01` line stands unamended.

### 5.1 Which slices are red-first, and which are guards

Slices **01, 02 and 03 are red-first** — each has scenarios that cannot pass until production code
changes. Slices **04 and 05 are guard slices**: their scenarios pass on the first run, and that is
the intended outcome, not a missing test. The developer must not go looking for a red bar in 04 or
05, and must not loosen the design to manufacture one. This is the same call ADR-0007 and ADR-0004
made for `greet-visitor`, applied consistently.

**Why slice 04 is not red-first.** The tempting sequencing would be to let slice 01 write
`savedName` **only when the slot is empty** (`if (visit.savedName !== null) return visit`) so that
slice 04's *"saving again replaces"* goes red. That is ADR-0007's forbidden move exactly: the
concept is live, the visitor can reach the branch, and what they reach is a defect — a visitor
who has saved "Ada", is greeted "Grace" and presses a button labelled *Save this name* would watch
nothing happen, with no explanation, for the length of a slice. It also requires the *less* obvious
implementation: `{ ...visit, savedName: visit.greetedName }` is what a developer writes anyway, and
it already replaces. Manufacturing red by prescribing a worse implementation is theatre.

Slice 04's three scenarios are **not** tautologies. Each fails against a specific, plausible wrong
implementation:

- *saving again replaces* fails against the "only-when-empty" guard above.
- *replacing asks nothing and offers no way back* fails the moment anyone adds a confirmation
  dialog, an "undo" control, or a third button inside the region.
- *saving the same name again still replaces it, focus retained* fails against the identical-save
  short-circuit warned about in §4.1 (which would freeze `saveCount` and silence the region —
  VH-02(c)), and against any change that remounts the region's controls on save and so drops focus.

**Why slice 05 is not red-first.** The only way to make it fail first would be to put `savedName`
somewhere that survives a mount — a module-level `let`, a context above the screen, web storage —
during slices 01–04, and then move it. ADR-0004 forbids all three, and ADR-0019's whole point is
that putting `savedName` in `Visit` makes Story 5 true **by construction, with no reset logic**.
Buying a red bar with a known state leak is the trade this design has now refused four times
(here, ADR-0004, ADR-0007, and slice 04 above). Slice 05's two scenarios are guards that fail the
moment a future change lifts the state out of `GreetingScreen` — the realistic regression.

If a guard scenario **does** go red, the fix is structural, never cosmetic:

- Slice 05 red on *"the Saved name region reads 'No name saved yet.'"* ⇒ the visit was lifted out
  of the component (INV-6a/INV-14). Put it back in `useState<Visit>(newVisit)` inside
  `GreetingScreen`; do **not** add reset-on-mount logic on top of leaked state.
- Slice 04 red ⇒ one of the three wrong implementations listed above; fix the one named, do not
  weaken the scenario.

### 5.2 Slice independence, and which invariants are live when

Each slice compiles and passes on its own under `strict` + `noUnusedLocals`, and each is one
sitting: one test file, one component, one module.

| Invariant | Live from | Note |
| --- | --- | --- |
| INV-9, INV-10, INV-11, INV-13, INV-15, INV-16, P6, P7, P8, P12 | **slice 01** | The whole saving concept, arriving whole (ADR-0007). INV-15 lands here even though its *hint* consumer arrives at slice 03, because the region needs it via INV-16 — it is one projection with two readers, not a rule half-written. |
| INV-14 | **slice 01**, and *pinned* at slice 05 | Not new work: it is INV-6a applied to two new fields of `Visit` (ADR-0019). |
| INV-12, P11 | **slice 02** | Greeting again does not exist before this slice; when it arrives it arrives complete, including its no-op guard. |
| P9, P10 | **slice 03** | The hint element and the ordered description. P10 **supersedes P3**; until slice 03, P3's single-id behaviour is exactly what P10 computes anyway (the list has at most one member), so the merged suite stays green throughout (§4.3, ADR-0024). |
| *(none new)* | slices 04, 05 | Guard slices — §5.1. |

### 5.3 The non-DOM tests, named so they are not mistaken for drift

`src/visit.test.ts` is an inner-cycle file, permitted by ADR-0003 and already home to the INV-6b
purity guard and the INV-8a/INV-8b counter assertions. This feature adds **three** assertions
there, and no others anywhere:

- **INV-11** (slice 01) — `save(save(v))` advances `saveCount` twice even when `greetedName` never
  changed. This is the domain half of R15; the DOM half is invisible to the suite (§5.4) and
  audible only to a human (VH-02(c)).
- **INV-10** (slice 01) — `save(newVisit) === newVisit` by identity. No scenario can reach this
  through the DOM, because P6 keeps the control absent; the assertion exists so the rule has a
  test as well as an owner.
- **INV-12** (slice 02) — `greetAgain(newVisit) === newVisit` by identity, same reasoning under
  P11.

Everything else this feature asserts is a scenario, through the DOM, by role and accessible name.
No `renderHook`, no spies, no snapshot. The one pre-existing exception — the `never writes to web
storage` constraint test sanctioned by `CLAUDE.md` — is untouched.

### 5.4 Seam mechanics, and what was measured rather than assumed

Verified against the installed toolchain (`@testing-library/react` 16, `jest-dom` 6.9.1,
`user-event` 14.6.4, `vitest` 3.2.7, jsdom 26) by building each shape and running it before this
document was written:

- **The region resolves by role and accessible name.** `<section aria-labelledby={id}>` with a
  visible `<h2 id={id}>Saved name</h2>` is found by
  `screen.getByRole('region', { name: 'Saved name' })`. Note the failure mode this buys: a
  `<section>` **without** an accessible name has *no* role at all, so dropping the `aria-labelledby`
  makes the query fail loudly rather than silently degrade.
- **`getAllByRole('status')` still returns exactly 1** with the region present — the merged suite's
  17 bare queries are safe (N8).
- **Ordering** is asserted as
  `expect(status.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()`.
- **Region text.** `expect(region).toHaveTextContent('No name saved yet.')` passes with the `<h2>`
  inside it (`toHaveTextContent` is a substring match). Two consequences: **(a)** do not write
  `toHaveTextContent(/^…$/)` on the region — the heading is part of its `textContent`; **(b)** for
  the disappearance steps use `expect(screen.queryByText('No name saved yet.')).toBeNull()`, which
  is stronger and page-wide. From slice 03 on, **two** nodes read `Saved: Ada`, so any by-text
  query must be scoped: `within(region).getByText('Saved: Ada')`.
- **Description order.** With `aria-describedby="name-error saved-name-hint"`,
  `toHaveAccessibleDescription('Please enter your name. Saved: Ada')` passes — the attribute's id
  order **is** the read order, and the parts are joined with a single space. The alert's keyed
  `<span>` child does not disturb it.
- **The described element's visibility** (issue 03's extra step) is asserted through the
  association, not by text:
  ```ts
  const field = screen.getByRole('textbox', { name: 'Name' })
  const ids = (field.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
  expect(document.getElementById(ids.at(-1) as string)).toBeVisible()   // the hint is last (P10)
  ```
- **The keyed child, measured with a `MutationObserver`** across an identical replace (save "Ada"
  twice with the greeting unchanged):

  | shape | mutations in the Saved name region | mutations in the status region |
  | --- | --- | --- |
  | `<span>{text}</span>` (no key) | **0** — the live region is silent; the visitor hears nothing | 0 |
  | `<span key={saveCount}>{text}</span>` | **2** — the node is replaced, so the live region fires | 0 |

  and for a *greet-again* with the same shape in place: **0** in the Saved name region, **2** in
  the status region. That is N7's cross-announcement requirement measured in both directions, and
  it is the evidence behind INV-11/P8. It is also why no scenario asserts it: the presence, text
  and attributes are byte-identical in both shapes, so a DOM assertion would pass whether or not
  the mechanism exists. Audibility remains **VH-02**, a human check.
- **Focus survives a save** in both shapes (`document.activeElement === saveButton` after the
  click) — because the button lives outside the keyed child and keeps its node identity (P12).
  Story 1's *"saving does not move focus"* and Story 4's focus step therefore assert
  `expect(saveControl).toHaveFocus()` directly.
- **A fresh visit** is `const { unmount } = render(<GreetingScreen />)` → interact → `unmount()` →
  `render(<GreetingScreen />)`. Not `window.location.reload()` (jsdom has no navigation), not a
  `key` change (that tests React).
- **House style**: `userEvent.setup()`, every interaction awaited, queries by role and accessible
  name, `globals: true` (no imported `describe`/`it`), one scenario = one `it`, never split across
  files.

---

## 6. Trade-offs, risks, and what is recorded where

### 6.1 ADR index (this feature)

| ADR | Decision | Alternatives rejected |
| --- | --- | --- |
| [0019](../../../docs/adr/0019-saved-name-in-the-visit-aggregate.md) | `savedName`/`saveCount` are fields of the existing `Visit` aggregate | a second `SavedName` aggregate; a third `useState` in the component; a context/store |
| [0020](../../../docs/adr/0020-save-captures-the-greeting-by-signature.md) | `save(visit)` takes **no** name argument, and is total | `save(visit, name)`; `save(visit, rawName)` with its own blank rule; guarding only in the component |
| [0021](../../../docs/adr/0021-greeting-again-reuses-the-submit-transition.md) | `greetAgain` delegates to `submit` | a second transition; `submit(visit, savedName)` at the call site; a `source` parameter on `submit` |
| [0022](../../../docs/adr/0022-the-saved-name-region-is-a-named-live-section.md) | named `<section>` + `aria-live="polite"`, name from the visible heading; **no** `role="status"` | `role="status"`; `aria-label`; a bare `<div aria-live>`; renaming `greet-visitor`'s status region |
| [0023](../../../docs/adr/0023-every-save-is-perceivable.md) | `saveCount` + a keyed child, extending ADR-0009 to the third region | leaving the mechanism to the developer; a timestamp/`Date.now()` key; blanking and refilling the region; moving focus |
| [0024](../../../docs/adr/0024-ordered-field-description-alert-before-hint.md) | `aria-describedby` is a computed ordered list; P10 supersedes P3 | two attributes; hint-first; a single merged description node; `aria-label` on the hint |
| [0025](../../../docs/adr/0025-saved-name-acceptance-seam-and-slice-shape.md) | one seam (`GreetingScreen.test.tsx`), no `App.test.tsx` scenario, no new component; 01–03 red-first, 04–05 guards | an `App` skeleton scenario; a `SavedNameRegion` component with its own suite; making 04/05 red-first |

**ADR numbering.** These start at **0019** because `docs/adr/0010`–`0018` already exist on the
unmerged `slice/greeting-log/*` branches. Two ADR files with the same number and different slugs
merge cleanly in git and leave the repo with two ADR-0010s — a silent collision is worse than a
temporary gap, and the gap closes when `greeting-log` merges.

### 6.2 Known risks, stated rather than mitigated away

1. **`greeting-log` and `saved-name` are concurrent features touching the same component.** Both
   add a `<section aria-labelledby><h2>` after the status region, both extend `Visit`, both amend
   `submit`'s non-blank literal. Checked: their region names differ (*"Greeted this visit"* vs
   *"Saved name"*) and `greeting-log`'s tests scope `getByRole('region', { name })`, so the two can
   coexist — but **whichever merges second owns a real reconciliation**, not a textual conflict
   resolution: the merged `submit` must carry *both* pairs of new fields, and the merged screen
   will hold two regions whose relative order nobody has specified. Flagged here; not designed for,
   because designing across an unmerged branch would be guessing.
2. **Two live regions on one screen.** `greeting-log` deliberately gave its region *no* `aria-live`
   to avoid double-announcing a greeting. This feature's region *does* announce, because a save
   happens alone with nothing else speaking (seed, *Decisions*). If all three features ship, a
   human must confirm the combination is not chatty — VH-02(d) covers the two-region case that
   exists today.
3. **`aria-live` without `role="status"` may be announced less reliably** by some assistive
   technology. That is VH-02's own open question and its named check; the alternative (taking
   `role="status"`) would turn 17 merged, human-verified assertions red for a reason none of their
   scenarios changed (N8). If VH-02(c) fails with a real screen reader, the reopened options are in
   ADR-0022.
4. **The hint is present mid-draft**, which the seed lists as an open question. This design
   implements the agreed default and does not resolve it; `savedNameText` has exactly one caller
   for the hint, so a change of mind is one condition in one place.

### 6.3 Human checks this design does not close

VH-01 (the region's saved-state copy) and VH-02 (a–e: audible announcement, including the
identical-replace case and the cross-announcement case) remain open and are **not** resolved here;
§5.4 says precisely which half is machine-checked and which half is not. VH-03 (slice 04's build
order) is appended by this node.
