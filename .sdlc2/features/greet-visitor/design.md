# Design — Greet the visitor by name (`greet-visitor`)

> Input: `.sdlc2/features/greet-visitor/feature.md` (seed + product contract), `issues/01..04`,
> `mockup.html` (state matrix, keyboard path, handoff AC), and `VERIFY-WITH-HUMAN.md`
> (**VH-01..VH-10** — decisions taken under caveat; honoured here, not relitigated). Output consumed
> by the `developer` node.
>
> This document designs the **domain model, the boundaries, the contracts, and the outer
> acceptance-test seam for each of the four slices**. It changes no acceptance criterion.
>
> **Every VH record is read, and each one names where it lands here:** VH-01 §4.4 · VH-02 §5 ·
> VH-03 §2.5, §6 · VH-04 P1, §4.2 · VH-05 R6, INV-5a · VH-06 §5.3, §6 · VH-07 §6 · VH-08 R2, §5 ·
> **VH-09 R9, INV-8a/INV-8b, P4/P5, ADR-0009** · **VH-10 §5.4** (the human check that backs R9).
> VH-09 and VH-10 arrived after this design's first rounds and were, until this round, unread —
> the design asserted that a synchronous pure transition left "no idempotency concern to design
> for", which is exactly backwards: the value-idempotence of `submit` is what made the live regions
> silent on a repeat submission. That is corrected in §3 and owned in §2.4 (VH-11 in
> `VERIFY-WITH-HUMAN.md`).

---

## 1. Problem understanding

### Functional requirements (from the product contract, restated as rules)

| # | Rule | Source |
| --- | --- | --- |
| R1 | A visitor submits free text ("the Name") from one screen and is greeted `Hello, <name>`. | Story 1 |
| R2 | The name is trimmed with `String.prototype.trim()` semantics before greeting; the field's own value is never rewritten. | Story 1, VH-08 |
| R3 | A name that is empty or whitespace-only after trimming is **blank**: no greeting is produced, and an alert explains what to do. | Story 2, VH-08 |
| R4 | A blank submission leaves any greeting already on screen exactly as it was. | Story 2 |
| R5 | A successful submission replaces the previous greeting and removes the alert. | Stories 1, 3 |
| R6 | The alert survives typing; it changes only on the next submission. | Story 3, VH-05 |
| R7 | Nothing survives a fresh visit (fresh mount): **no name** (INV-6c), **no greeting, no alert** (INV-6a). | Story 4 |
| R8 | No length limit, no truncation. | Story 1 |
| R9 | **Every submission is perceivable**, including one whose outcome is byte-identical to what is already on screen: a successful submit renews the status region's content **and nothing else**; a failing submit renews the alert's content **and nothing else**. Neither region is ever removed, recreated, or left textless once it holds content. | `mockup.html` rows 4a/12a and §5; VH-09. **Not an acceptance criterion** — no scenario can observe it under this seam (VH-10, §5.4). |

### Non-functional / cross-cutting requirements

| # | Requirement | Consequence for this design |
| --- | --- | --- |
| N1 | The greeting must be **announced** — which is two conditions, not one: **(a)** the `role="status"` region is present from first render and never created-on-demand (VH-04), and **(b)** each submission renews its region's content so a live region actually fires, even when the text is unchanged (VH-09, R9). | **(a)** presentation invariant P1. **(b)** INV-8a/INV-8b (domain) with P4/P5 (component), decided in **ADR-0009**; the announcement itself is human-verified (VH-10, §5.4). |
| N2 | The error must carry meaning in **words**, tied to the field via `aria-describedby`; no colour-only signal. | Presentation invariants P2/P3; colour half is a human VERIFY check (VH-07). |
| N3 | Nothing is stored, transmitted or remembered — no backend, no web storage, no analytics. | No driven port exists in this feature (ADR-0006). INV-6b owns the rule; **only its "no import" half is structural** — the ambient-globals half is a lexical guard test plus a review checklist line (ADR-0008). |
| N4 | Tests assert behaviour through the rendered DOM (repo `CLAUDE.md`), under React Testing Library + user-event via Vitest/jsdom. | The seam in §5 is a DOM seam for every slice; no spies on `Storage`, no `renderHook`. |
| N5 | Test command `npm test -- --run`; build `npm run build` (`tsc -b && vite build`). | Every slice must typecheck standalone under `strict` + `noUnusedLocals` — see the §4.2 note on why `GreetingScreen` carries **no** return-type annotation. |
| N6 | This is a lab repo: no new runtime dependency, no new test stack (`CLAUDE.md` rules out Playwright/Cucumber deliberately). | ADR-0003, ADR-0004, ADR-0005 all resolve toward "nothing new installed". |

### Explicit non-goals

Persistence, accounts, i18n, styling systems, event bus, routing, a `<form>` decision (left open by
VH-01 — see §4.4).

---

## 2. Domain model

### 2.1 Bounded context

**One context: `Greeting`.** It owns the rules for turning submitted text into a greeting or a
blank-name alert. Everything else in the app (`AppBanner`, `App`, `main.tsx`) is the **app shell** —
a composition root that hosts the context and knows nothing about its rules. There is no second
context, no integration, no anti-corruption layer. Inventing a second one at this size would be
ceremony; the seam that matters (§4) is between the *rules* and the *DOM*.

### 2.2 Ubiquitous language → code names

The seed's and the contract's terms are used verbatim in code; nothing is renamed on the way in, and
every identifier that appears in the module surface of §4.1 has a row below.

| Term (seed / contract) | Code name | Kind |
| --- | --- | --- |
| Visitor | *(implicit — the actor, not a type; nobody has an identity)* | — |
| Name — as typed into the field | `rawName: string` (never rewritten — INV-7) | Value |
| Name — as submitted and trimmed | `greetedName: string \| null` (the aggregate's field; `null` until the first successful submission) | Value (aggregate state) |
| Blank name | `isBlank(rawName): boolean` | Rule (predicate) |
| Blank name — *the most recent submission was one* (what the Alert keys off) | `lastSubmissionWasBlank: boolean` (the aggregate's second field) | Value (aggregate state) |
| Greeting — *how many have been produced this visit* (so the second identical one is still a distinct greeting — R9) | `greetingCount: number` (the aggregate's third field, monotonic) | Value (aggregate state) |
| Blank name — *how many submissions have been rejected this visit* (so the second identical rejection is still a distinct rejection — R9) | `blankCount: number` (the aggregate's fourth field, monotonic) | Value (aggregate state) |
| Greeting | `greetingText(visit): string` | Derived value |
| Alert | `alertText(visit): string \| null` | Derived value |
| Alert — *its fixed wording* (VH-03) | `ALERT_MESSAGE` | Constant |
| Submit control — *"the visitor activates the submit control"* | `submit(visit, rawName): Visit` (the domain command) — the button itself is a JSX node in `GreetingScreen`, named there, not here | Command |
| Greeting screen | `GreetingScreen` component | Driving adapter |
| **Fresh visit** | `newVisit` (the initial state) — and, at the seam, a fresh mount of `GreetingScreen` | Lifecycle |
| **Visit** *(the aggregate; see the note below)* | `Visit` in `src/visit.ts` | Aggregate root |

> **Why the aggregate is `Visit` and not `GreetingSession`.** An earlier round of this design named
> it `GreetingSession`. That was wrong on the contract's own terms: the seed's *Out of scope* says
> "Accounts, **sessions**, authentication of any kind", so "session" is the one word this feature
> must not overload — a reader would have to decide whether it meant the excluded concept. The
> contract already has an agreed term for exactly this thing's lifetime: **Fresh visit** ("arriving
> at the greeting screen anew … with nothing from a previous visit lingering"). So the aggregate is
> `Visit`, its initial value is `newVisit`, its module is `src/visit.ts`, and every sentence in this
> design that says "the visit" means that value. Recorded in ADR-0001.

### 2.3 The one aggregate: `Visit`

```
Aggregate root: Visit      (in-memory, per mount, no identity, no persistence)
  state
    greetedName            : string | null    -- trimmed, never blank; null until first success
    greetingCount          : number           -- greetings produced so far; 0 on a fresh visit
    lastSubmissionWasBlank : boolean          -- false on a fresh visit
    blankCount             : number           -- blank submissions rejected so far; 0 on a fresh visit
  command
    submit(rawName)                            -- the ONLY state transition in the feature
  projections (pure reads, no state)
    greetingText()  -> '' | `Hello, ${greetedName}`
    alertText()     -> null | 'Please enter your name.'
```

`Visit` is an **aggregate of one**: a single consistency boundary, a single command, and therefore
**no operation in this feature spans two aggregates** — transactionally or otherwise. That is a
structural property, not a promise: there is exactly one mutable thing **in the domain**, and it is
replaced wholesale by one pure function in one React state update per submission (ADR-0001).

> **"One mutable thing" is a claim about the domain, not about the running screen.** The component
> holds a second `useState` — `rawName`, the visitor's draft (INV-7) — which is deliberately *not*
> in the aggregate: an unsubmitted keystroke is not a domain fact, and putting it in `Visit` would
> make every keystroke a domain transition. The two hooks appear side by side in §3's diagram, and
> each has its own lifetime invariant (INV-6a for the visit, INV-6c for the draft) because R7
> demands that **both** are gone after a fresh mount.

**Why the two counters exist** (they are new this round; ADR-0009 is the record). Without them the
aggregate cannot tell *"the visitor submitted `Ada` twice"* from *"the visitor submitted `Ada`
once"*: both produce `{ greetedName: 'Ada', lastSubmissionWasBlank: false }`. That is an
under-modelled domain, and it has a user-visible consequence — the DOM does not change, so the live
region never fires and the second click is silent to a screen-reader visitor (R9, VH-09; measured,
see §5.4). `greetingCount` and `blankCount` make *"a submission happened, and this is which one"* a
fact the domain can state; the component renders that fact as identity and nothing else (P4/P5).
They are monotonic, per-visit, never reset except by a fresh visit, and **never branched on** by
anybody.

**Value objects.** *Name* is modelled as a plain `string` narrowed by the rules `isBlank` /
`trim()`, not as a branded/wrapped type — see ADR-0002 for why the wrapper lost. *Greeting* and
*Alert* are **not stored at all**; they are projections of the visit (ADR-0002), so the seed's
"the greeting is derived, not stored — no second source of truth to drift" is true by construction
rather than by discipline.

**Entities.** None. Nothing in this feature has identity or a lifecycle beyond the mount.

**Domain events.** Deliberately none — see ADR-0006 for where they would attach if persistence or
analytics ever arrives.

### 2.4 Invariants and their owners

Every invariant below names **exactly one enforcement point** — one function, or one component, that
a reader can open. Where a rule has two halves with two natural owners, it is split into two
invariants so that each half still has a single owner, rather than left as one invariant with two.
There are four such splits, and the reason differs each time: writer/reader (INV-5a/INV-5b, the
alert flag), lifetime/purity (INV-6a/INV-6b, the visit's scope), **two independent hooks**
(INV-6a/INV-6c — R7 needs both, and each can be hoisted without the other), and **two outcomes**
(INV-8a/INV-8b — R9 must renew one region *without* touching the other, so the two counters can
never be one). No invariant is enforced only by a test.

| ID | Invariant | Single owner | How it is enforced there |
| --- | --- | --- | --- |
| INV-1 | A name is blank **iff** `rawName.trim() === ''`. | `isBlank` in `src/visit.ts` | One predicate; it is the only place `trim()`-emptiness is decided, and `submit` is its only caller. Components never test blankness themselves. |
| INV-2 | `greetedName`, when non-null, is **trimmed and non-blank**. | `submit` in `src/visit.ts` | `submit` is the only writer of `greetedName`; it assigns `rawName.trim()` only on the non-blank branch. `Visit` values are never constructed anywhere else except `newVisit`. *(Sequencing: the "trimmed" half is live at slice 01; the "non-blank" half arrives with the blank branch at slice 02, because the blank concept does not exist before then — §5.2, ADR-0007.)* |
| INV-3 | The greeting text is exactly `Hello, ` + `greetedName`, and is `''` when `greetedName === null`. | `greetingText` in `src/visit.ts` | The single formatter; the component renders its return value verbatim and never concatenates `'Hello, '` itself. |
| INV-4 | A blank submission never changes `greetedName` (R4). | `submit` | The blank branch returns `{ ...visit, lastSubmissionWasBlank: true }` — `greetedName` is carried through, not recomputed or cleared. |
| INV-5a | `lastSubmissionWasBlank` is written **only** by `submit`, and always describes the most recent submission: `true` on the blank branch, `false` on the non-blank branch. | `submit` in `src/visit.ts` | Both return paths assign it, so it can never be stale. Nothing else — no keystroke handler, no effect, no component — may write it; that is what makes R6 ("the alert stays until the visitor submits again") hold. *(Sequencing: the invariant does not exist before slice 02, and arrives **whole** at slice 02 — both branches, in the same change. Deferring the non-blank branch to slice 03 to manufacture a red bar was considered and rejected: it would ship a lingering alert beside a fresh greeting. ADR-0007, §5.1.)* |
| INV-5b | Alert text exists **iff** `lastSubmissionWasBlank` — `ALERT_MESSAGE` when true, `null` when false. | `alertText` in `src/visit.ts` | The sole reader of the flag, and the sole producer of the message. The component never inspects the flag and never types the message literal. |
| INV-6a | A visit's lifetime is exactly one mount of `GreetingScreen`: it begins at `newVisit` and ends when the component unmounts. This is the **greeting and alert** half of R7 — both live in `Visit`, so both are gone on a fresh mount. | `GreetingScreen` | One `useState<Visit>(newVisit)`; no ref, no context, no module import that could hold it. A fresh mount therefore starts at `newVisit` (`greetedName: null`, `lastSubmissionWasBlank: false`, both counters `0`) with no reset logic to get wrong. |
| INV-6b | The domain module holds nothing that could outlive a mount, and reaches nothing that could. | `src/visit.ts` | Two conditions, both on this one module: **(a)** no module-level mutable binding (`let`/`var`/mutable object) and **no import at all**; **(b)** no reference to any ambient browser global — `localStorage`, `sessionStorage`, `indexedDB`, `fetch`, `XMLHttpRequest`, `document`, `window`, `globalThis`, `navigator` (and, for determinism, `Date` and `Math.random`). A component *cannot* enforce this about a module it imports, which is why it is a separate invariant with the module as its owner (ADR-0003). **How each half is actually caught, stated honestly: (a) is visible in the import list and the top-level declarations; (b) is *not* — `tsconfig.json` sets `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, so `localStorage.setItem(...)` typechecks and runs inside a module with an empty import list. Half (b) is therefore enforced by the lexical guard test and the review checklist in ADR-0008, not by structure.** |
| INV-6c | The **draft name** has the same lifetime as the visit — exactly one mount of `GreetingScreen`, starting empty. This is the **"no name"** half of R7 (Story 4's literal `Then the Name field is empty` step, driven at slice 04). | `GreetingScreen` | One `useState<string>('')` **inside the component body**. It may not be hoisted to a module-level `let`, a context, a ref, web storage, or a `defaultValue` on an uncontrolled input — each of those satisfies INV-6a and INV-7 as written and still fails Story 4. A fresh mount re-runs `useState('')`, so the field is empty by construction, with no reset logic. |
| INV-7 | The Name field's value is whatever the visitor typed — trimming affects the greeting only (R2). | `GreetingScreen` | The controlled input's value is `rawName` state; nothing ever writes `trim()`'s result back into it. The domain receives `rawName` and returns a `Visit`; it never returns a field value. *(Lifetime is INV-6c's job, not this one: INV-7 says what the value **is**, INV-6c says how long it lives.)* |
| INV-8a | **Every successful submission is a new greeting**, even when the text is identical: `greetingCount` is incremented on `submit`'s non-blank branch, and changed nowhere else, ever. (R9, VH-09 — the status-region half.) | `submit` in `src/visit.ts` | The non-blank branch writes `visit.greetingCount + 1`; the blank branch carries the value through unchanged, so a failing submit can never renew the greeting (this is what keeps R4 / mockup row 9 true). Monotonic within a visit; reset only by `newVisit` (INV-6a). Unit-asserted in `src/visit.test.ts` (§5.4). |
| INV-8b | **Every blank submission is a new rejection**, even when the alert text is identical: `blankCount` is incremented on `submit`'s blank branch, and changed nowhere else, ever. (R9, VH-09 — the alert half.) | `submit` in `src/visit.ts` | The blank branch writes `visit.blankCount + 1`; the non-blank branch carries it through unchanged, so a successful submit never renews the alert (it removes it — P2). Arrives at slice 02 with the rest of the blank-name concept (ADR-0007, §5.2). |

Presentation invariants (owned by `GreetingScreen`, and by nothing else — the domain has no
knowledge of ARIA, roles, ids, or element shape):

| ID | Invariant | Enforced by |
| --- | --- | --- |
| P1 | The `role="status"` region is rendered on **every** render, from first mount, and holds `greetingText(visit)` — which is `''` when there is no greeting (N1, VH-04). | Unconditional JSX: the region is never inside a `{cond && ...}`. |
| P2 | The `role="alert"` element is rendered **iff** `alertText(visit) !== null`, and is absent from the DOM otherwise. | A single `{alert !== null && <p role="alert" id={ALERT_ID}>{alert}</p>}`. Note the division of labour with INV-5b: the domain decides *whether there is a message and what it says*; the component decides *whether an element exists*. |
| P3 | The Name field's `aria-describedby` references the alert **iff** the alert is present, and is absent otherwise. | The same one condition as P2, computed once per render: `aria-describedby={alert !== null ? ALERT_ID : undefined}`. P2 and P3 read the same expression so they cannot disagree. |
| P4 | The status region's text lives in **one keyed child**, `<span key={visit.greetingCount}>`, so a successful submission replaces that child node even when the string is byte-identical — while the `role="status"` element itself is never removed, recreated, or (once a greeting exists) left textless. (R9 / mockup row 4a; N1(b).) | The region is written exactly once, unconditionally (P1), as `<p role="status" aria-live="polite"><span key={visit.greetingCount}>{greetingText(visit)}</span></p>`. The key is read from the aggregate and never computed in the component — INV-8a is what makes it change. |
| P5 | The alert's text lives in **one keyed child**, `<span key={visit.blankCount}>`, so a repeated failing submission replaces that child node even when the string is identical — while the `role="alert"` element keeps its identity and its `id` for as long as it is present. (R9 / mockup row 12a.) | `{alert !== null && <p role="alert" id={ALERT_ID}><span key={visit.blankCount}>{alert}</span></p>}`. P3's `aria-describedby` target is therefore stable across a repeated failure. |

> **The scoping rule matters as much as the mutation** (mockup §5, row 9): a failing submit must
> leave the status region *byte-for-byte untouched* — force-mutating it would re-announce a stale
> `Hello, <name>` as feedback for a submission that failed, contradicting Story2-S4. P4 and P5 get
> this for free because each key comes from the counter its own branch writes (INV-8a/INV-8b): a
> blank submit changes `blankCount` only, so React re-keys the alert's child and touches nothing in
> the status region. **Measured, not assumed** — see §5.4.

> Both `role="status"` and `role="alert"` carry implicit live-region semantics; adding
> `aria-live="polite"` to the status region (as the mockup draws) is permitted but redundant, and
> `aria-live` must **not** be added to the alert (double announcement).

> **Why R9 is carried by a pair of invariants rather than one.** Every other rule here has exactly
> one owner — one function or one component a reader can open. R9 spans two files by nature (a
> domain fact must exist *and* be rendered as identity), so it is split the same way INV-5a/INV-5b
> already are: `submit` owns "a new submission happened" (INV-8a/INV-8b), `GreetingScreen` owns
> "that shows up as a replaced node" (P4/P5). Neither half is enforced by a test alone, and neither
> half is owned by two places.

### 2.5 Where visitor-facing text lives (and why)

The domain module owns the two **messages** (`'Hello, '` inside `greetingText`, and
`ALERT_MESSAGE`), because the seed defines *Greeting* as "the rendered `Hello, <name>` message" —
the message is the rule's output, not a piece of layout. The component owns everything that is
**element shape or label**: the button's accessible name `'Greet me'`, the field's label `'Name'`,
roles, ids, `aria-*`. Consequence, stated so VH-03 has one known edit site each: the alert copy is
`ALERT_MESSAGE` in `src/visit.ts`; the button name is one JSX node in `GreetingScreen.tsx`. The
alternative (a nullable marker the component maps to copy) was considered and rejected in ADR-0003,
which also states the rule the module must still obey: no id, role, class name or `aria-*` name may
appear in `src/visit.ts`.

---

## 3. Architecture

Layers, and the dependency direction (arrows point at what a layer is allowed to know):

```
  ┌─────────────────────────── app shell (composition root) ────────────────────────────┐
  │  index.html → src/main.tsx → src/App.tsx                                            │
  │     <main> <AppBanner/>  <GreetingScreen/> </main>                                  │
  └──────────────────────────────────┬──────────────────────────────────────────────────┘
                                     │ renders
  ┌──────────────────────────────────▼──────────────── driving adapter (transport) ─────┐
  │  src/GreetingScreen.tsx        TWO hooks, both component-local, both die at unmount  │
  │    useState rawName : string        (INV-7 value · INV-6c lifetime)                 │
  │    useState visit   : Visit         (INV-6a lifetime)                               │
  │    onSubmit  →  setVisit(v => submit(v, rawName))          [one transition]         │
  │    render    →  greetingText(visit) into role="status"     (P1)                     │
  │                   keyed by visit.greetingCount             (P4)                     │
  │                 alertText(visit)    into role="alert"      (P2, P3)                 │
  │                   keyed by visit.blankCount                (P5)                     │
  └──────────────────────────────────┬──────────────────────────────────────────────────┘
                                     │ calls (one-way: domain imports nothing from here)
  ┌──────────────────────────────────▼──────────────── domain (pure) ───────────────────┐
  │  src/visit.ts          no React · no DOM · no I/O · no module-level mutable state   │
  │    newVisit · submit · greetingText · alertText · isBlank · ALERT_MESSAGE           │
  └─────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                              (no driven ports — ADR-0006)
```

**Data flow for one submission**

```
visitor clicks "Greet me"
      │
      ▼
GreetingScreen.onSubmit ──► submit(visit, rawName)              pure, synchronous, total
      │                          │
      │                          ├─ isBlank(rawName) ─ yes ─► { greetedName: unchanged,
      │                          │                              greetingCount: unchanged,
      │                          │                              lastSubmissionWasBlank: true,
      │                          │                              blankCount: +1 }
      │                          └─ no ──────────────────────► { greetedName: rawName.trim(),
      │                                                          greetingCount: +1,
      │                                                          lastSubmissionWasBlank: false,
      │                                                          blankCount: unchanged }
      ▼
setVisit(next)  ──► re-render ──► greetingText(next) → role="status"   (text or ''), child re-keyed
                                                                        by greetingCount   (P4)
                                  alertText(next)    → role="alert"    (element or absent), child
                                                                        re-keyed by blankCount (P5)
```

The whole feature is one synchronous state transition: no async work, no effect, no cleanup, and so
no retry or ordering concern to design for.

**Idempotency, stated correctly (this replaces an earlier claim that was exactly backwards).**
`submit` is pure and deterministic, but it is deliberately **not** value-idempotent: submitting the
same name twice returns a *different* `Visit` the second time (`greetingCount` advances), and two
blank submissions in a row differ likewise (`blankCount` advances). An earlier round called
value-idempotence a virtue — "repeat submissions are naturally idempotent for the same input" — and
treated it as a reason no idempotency question needed designing. It is the opposite: value-
idempotence is precisely the hazard. A `Visit` that compares equal renders identical text, React
writes nothing to the DOM, no mutation reaches the live region, and a screen-reader visitor who
clicks "Greet me" a second time hears **nothing** (mockup rows 4a/12a, VH-09). Measured on a real
build of both shapes — 0 mutations without the counters, 2 with them, and 0 spill onto the region
that did not change — in §5.4. What *is* idempotent, and must stay so, is the **rendering**: given a
`Visit`, the DOM is a pure function of it; the counters change the value, never the render rule.

**Where this design deliberately stops.** No hook extraction (`useVisit`), no reducer, no context,
no store, no `src/domain/` folder tree. Each would add a layer whose only inhabitant is a five-line
function — see ADR-0003 and ADR-0004.

---

## 4. Contracts

### 4.1 Domain module — `src/visit.ts` (the only "port" the UI depends on)

**This is the module's surface once slice 02 has landed** — the end state (slices 03 and 04 add no
production code; §5.1). One guarantee is sequenced: the blank-name half of the module (`isBlank`,
`lastSubmissionWasBlank`, `alertText`, `ALERT_MESSAGE`, and `submit`'s two branches) does not exist
at slice 01, because the blank-name concept does not exist in slice 01's scenarios. §5.2 says exactly
what is live when. Nothing is sequenced *within* an invariant: when a rule arrives, it arrives whole
(ADR-0007).

```ts
/** Fixed alert copy. Human-confirmed and shortened — see VERIFY-WITH-HUMAN.md VH-15. */
export const ALERT_MESSAGE = 'Please enter your name.'

/** In-memory state of one visit. Replaced wholesale; never mutated. */
export type Visit = {
  /** Trimmed and non-blank when present; null until the first successful submission. */
  readonly greetedName: string | null
  /** INV-8a. Greetings produced this visit. Monotonic; identity, not a quantity to display. */
  readonly greetingCount: number
  readonly lastSubmissionWasBlank: boolean
  /** INV-8b. Blank submissions rejected this visit. Monotonic; same role as greetingCount. */
  readonly blankCount: number
}

/** The state a fresh visit starts from. */
export const newVisit: Visit = {
  greetedName: null,
  greetingCount: 0,
  lastSubmissionWasBlank: false,
  blankCount: 0,
}

/** INV-1. Blank means blank after String.prototype.trim() — all JS whitespace (VH-08). */
export function isBlank(rawName: string): boolean

/** The only state transition. Total, pure, synchronous. INV-2, INV-4, INV-5a, INV-8a, INV-8b. */
export function submit(visit: Visit, rawName: string): Visit

/** INV-3. '' when there is no greeting yet — the status region is always rendered (P1). */
export function greetingText(visit: Visit): string

/** INV-5b. null when there is no error — the alert element is then absent (P2). */
export function alertText(visit: Visit): string | null
```

Contract notes the developer must not drift from:

- `greetingText` returns `''`, **never** `null` and never a placeholder like `" "`, because P1
  requires `toHaveTextContent('')` to pass on an always-present element.
- `submit` takes the **raw** string and does its own trimming: callers never pre-trim, so INV-1/INV-2
  cannot be bypassed.
- **`greetingCount` and `blankCount` are the only two fields the component reads directly**, and it
  reads them only as React `key`s (P4/P5). Nothing — component or domain — ever branches on their
  value, compares them for order, or renders them as text. Two consequences the developer must not
  drift from: **(a)** they are never displayed (a visible "2" would break VH-04's *"the status region
  contains no text"* at rest and Story 1's exact-text assertions), and **(b)** no projection
  (`greetingRevision(visit)` and friends) is added to wrap them — a function whose whole body is
  `return visit.greetingCount` is an abstraction with a cost and no work (ADR-0003, ADR-0009).
- The reference implementation of `submit`, exactly as verified (`npx tsc -b` clean, `vitest` green):

  ```ts
  export function submit(visit: Visit, rawName: string): Visit {
    if (isBlank(rawName)) {
      return { ...visit, lastSubmissionWasBlank: true, blankCount: visit.blankCount + 1 }
    }
    return {
      greetedName: rawName.trim(),
      greetingCount: visit.greetingCount + 1,
      lastSubmissionWasBlank: false,
      blankCount: visit.blankCount,
    }
  }
  ```

  Note which counter each branch leaves alone — that asymmetry *is* R9's scoping rule (§2.4, P4/P5).
- Nothing in this module imports React or references any ambient browser global (`document`,
  `window`, `localStorage`, `fetch`, …). That is what makes it testable without a DOM. Note which
  half of that is self-enforcing: the *import* half is (an import is a line in the file's header);
  the *ambient global* half is not, because `DOM` is in `tsconfig.json`'s `lib` — it is caught by the
  guard test in §5.3 and by review (ADR-0008, INV-6b).
- No id, role, class name or `aria-*` attribute name appears here (ADR-0003). Message text does —
  deliberately, and only the two strings named in §2.5.

### 4.2 Component contract — `src/GreetingScreen.tsx`

```tsx
export function GreetingScreen() { /* no props; owns its own visit state */ }
```

> **No return-type annotation, on purpose.** `JSX.Element` does **not** compile in this repo:
> `@types/react` 19 declares `namespace JSX` only inside `declare namespace React`, with no
> `declare global`, so `export function GreetingScreen(): JSX.Element` fails `tsc -b` with
> `TS2503: Cannot find namespace 'JSX'` and breaks `npm run build` (verified against the installed
> toolchain before writing this line). The house style has no annotation either — `App.tsx` and
> `AppBanner.tsx` both read `export function X() {`. If an annotation is ever genuinely wanted it
> must be `React.JSX.Element` with `React` imported.

Rendered DOM contract (the vocabulary every acceptance test binds to):

| Element | Query used by tests | Fixed by |
| --- | --- | --- |
| Name field | `getByLabelText('Name')` / `getByRole('textbox', { name: 'Name' })` | contract "Name field" |
| Submit control | `getByRole('button', { name: 'Greet me' })` | contract "Submit control" (VH-03) |
| Status region | `getByRole('status')` — always present; `toHaveTextContent('')` or `'Hello, X'` | VH-04, P1 |
| Alert | `queryByRole('alert')` — `null` when no error; text `ALERT_MESSAGE` | VH-04, P2 |
| Linkage | Name field's `aria-describedby` → the alert's `id` | Story 2, P3 |
| Keyed child (both regions) | **no query of its own** — invisible to every scenario | R9, P4/P5 (§5.4) |

The label must be a real association (`<label htmlFor>` + `id`, or a wrapping `<label>`), not
`aria-label`, so the visible label the mockup draws and the accessible name are the same thing.

The keyed `<span>` inside each region (P4/P5) is deliberately invisible to the suite, and that was
checked rather than assumed against the installed toolchain (`@testing-library/jest-dom` 6.9.1,
`user-event` 14.6.4): `getByRole('status')` still resolves the `<p>`, `toHaveTextContent('')` still
passes on the region while its child span is empty, `toHaveTextContent('Hello, Ada')` still passes
with the text one level down, and `queryByRole('alert')` still returns the `<p role="alert">` that
`aria-describedby` points at. No acceptance step changes, and no acceptance step can see the
mechanism — which is exactly why R9 needs a human check (§5.4, VH-10) rather than a scenario.

### 4.3 App shell contract — `src/App.tsx`

```tsx
<main>
  <AppBanner />        {/* unchanged: <h1>sdlc2 lab</h1> */}
  <GreetingScreen />
</main>
```

`AppBanner` is not modified by any slice. Story 1's "the existing heading is still shown" is a
statement about this composition, which is why it is asserted at the `App` seam (§5).

### 4.4 Transport detail left open (VH-01 — honoured, not reopened)

Whether the field and button sit inside a native `<form>` is the developer's choice; no scenario
tests Enter-to-submit either way. The design supports both because the domain call is identical —
only the handler differs (`onSubmit` + `event.preventDefault()` vs. `onClick`). **If** a `<form>` is
used, `preventDefault()` is required: jsdom logs "Not implemented: HTMLFormElement.prototype.submit"
and the test output gets noisy. If a plain button is used it must be `type="button"` (harmless
outside a form, essential if one is added later).

---

## 5. The seam — per slice

**Seam family (all four slices):** the declared frontend seam — React Testing Library +
`user-event` via Vitest (jsdom), driving the rendered DOM by role and accessible name. **Every one of
the sixteen scenarios is driven through it; no slice introduces a different kind of acceptance test.**
The exceptions are not acceptance tests at all, live in one file, and are named so they cannot be
mistaken for drift: `src/visit.test.ts` — the INV-6b purity assertion that lands with `src/visit.ts`
in slice 01 (§5.3, ADR-0008), and the INV-8a/INV-8b counter assertions that back R9 (§5.4,
ADR-0009). ADR-0003 already permits that file as an inner cycle; it contains no DOM and no scenario.
Run with `npm test -- --run`; typecheck with `npm run build`.

Two entry points are used, and the choice is per scenario, not arbitrary:

- **`render(<App />)`** — used only where a scenario asserts the *composition* (the `sdlc2 lab`
  heading co-existing with the greeting). This is the true end-to-end walking-skeleton seam.
- **`render(<GreetingScreen />)`** — used for every scenario whose subject is the greeting screen
  itself. It is also the unit whose mount/unmount defines a **fresh visit** (VH-02).

| Slice | Issue | Kind | Outer seam (file · entry point) | Scenarios driven | Production change |
| --- | --- | --- | --- | --- | --- |
| 01 | `01-get-greeted-by-name` | red-first | `src/App.test.tsx` · `render(<App />)` | *Visitor is greeted by the name they typed* (the walking skeleton — the one scenario asserting the heading before and after submission) | `App.tsx` renders `<GreetingScreen/>`; new `GreetingScreen.tsx`; new `visit.ts` (`newVisit`, `submit`, `greetingText`, and `greetingCount` — INV-8a/P4) |
| 01 | `01-get-greeted-by-name` | red-first | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | status region present & empty before first submission · trims spaces · trims tabs · no length limit · new name replaces previous greeting | same slice, same files — plus the two non-DOM assertions that land with `visit.ts` in `src/visit.test.ts` (with its four-line `src/rawModules.d.ts`): the INV-6b purity guard (§5.3, ADR-0008) and the INV-8a counter assertion (§5.4, ADR-0009) |
| 02 | `02-blank-name-alert` | red-first | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | all 5: empty → alert · whitespace-only → alert · tab-only → alert · blank keeps existing greeting · `aria-describedby` linkage | adds `isBlank`, the `lastSubmissionWasBlank` field, `alertText`, `ALERT_MESSAGE`, **and `blankCount`** (INV-8b/P5); `submit` splits into two branches, **both** assigning the flag (INV-5a whole — ADR-0007); alert element + keyed child + linkage in the component; one more `visit.test.ts` assertion for INV-8b |
| 03 | `03-recover-from-alert` | **guard slice** | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | correction clears alert & greets · alert stays until next submit · retry with whitespace still alerts | **none expected** — INV-5a arrived whole at slice 02, so recovery already works; these three scenarios pin it (see §5.1, ADR-0007) |
| 04 | `04-fresh-visit-starts-clean` | **guard slice** | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)`, then `unmount()`, then `render(<GreetingScreen />)` again | fresh visit after a greeting · fresh visit after an alert | **none expected** — the two scenarios pin INV-6a/INV-6b, which ADR-0004 already placed (see §5.1) |

Seam mechanics the developer should not have to rediscover:

- **A fresh visit** is `const { unmount } = render(<GreetingScreen />)` → interact → `unmount()` →
  `render(<GreetingScreen />)` → assert on the new tree. Not `window.location.reload()` (jsdom has
  no navigation — VH-02), and not a `key` change (that proves React remounted, not that a visitor
  arriving anew sees a clean screen).
- **The primary paths are driven keyboard-only** — adopting `mockup.html` §7's directive rather than
  quietly declining it. The walking-skeleton scenario (slice 01) and the recovery scenario (slice 03)
  are written with no pointer at all:

  ```ts
  await user.tab()                 // → Name field (it is the first focusable; tab order is
                                   //   Name field → Submit control, two stops, mockup §5)
  await user.keyboard('Ada')
  await user.tab()                 // → "Greet me"
  await user.keyboard('{Enter}')   // activates it
  ```

  Verified against the installed `user-event` 14.6.4, both VH-01 shapes and both traps:
  `{Enter}` on a focused `<button type="button">` **outside** any `<form>` activates it (a native
  button activates on Enter with or without a form, so this is compatible with VH-01 either way);
  `Ada{Enter}` typed **in the field** submits only in the `<form>` shape, so it must not be used in a
  shared scenario; `await user.tab({ shift: true })` walks back to the field for the recovery path;
  Space is a **literal space** in v14 (`await user.keyboard(' ')` activates the button) — and
  `'{Space}'` is *not* a v14 key descriptor: it throws nothing, activates nothing, and leaves the
  scenario silently asserting against an unsubmitted screen. Pointer (`user.click`) and `fireEvent`
  shortcuts stay out of the happy path and the recovery path; `user.click` is fine in the remaining
  scenarios, where the interaction is not the subject.
- **Tabs** go into the field via `user-event`'s `paste`, because a literal Tab keystroke moves focus
  (VH-08, and the issues say "enters", not "types"). The mechanics matter, because these two
  scenarios exist solely to kill a space-only trim, and both plausible shortcuts are wrong:

  ```ts
  await user.tab()                 // focus the Name field — paste() targets the FOCUSED element
  await user.paste('\tAda\t')      // slice 01; slice 02's tab-only case pastes '\t'
  ```

  (`await user.click(screen.getByLabelText('Name'))` focuses it just as well and is acceptable here —
  the tab-trimming scenarios are not a primary path — but `user.tab()` is preferred, verified, and
  keeps the whole suite pointer-free.)

  Do **not** reach for `user.type(nameField, '{{Tab}')`: escaping in user-event v14 inserts the five
  literal characters `{Tab}`, not U+0009 — the field would hold `{Tab}Ada{Tab}`, `trim()` would strip
  nothing, slice 01's tab scenario would go red for a reason unrelated to the rule under test, and
  slice 02's tab-only case would silently stop being blank at all. And do not call `user.paste(...)`
  without focusing first: with focus on `document.body` the paste lands nowhere and
  `getByRole('status')` reads empty.
- **`toHaveTextContent('')`** is the pinned observation for the empty status region; pair it with
  `getByRole('status')` (not `queryBy`) so an absent region fails loudly (VH-04). It keeps working
  with P4's keyed child in place (checked on `jest-dom` 6.9.1, §4.2) — an empty `<span>` contributes
  no text content.
- **Do not write a scenario for mockup rows 4a/12a.** Their presence/text/`aria-describedby` are
  byte-identical to rows 4/12, and jsdom implements no live-region announcement, so an assertion
  there would pass whether or not the mechanism exists — it would be a test that reads as coverage
  and is not (VH-10). What *is* asserted mechanically is the domain half, in `visit.test.ts` (§5.4).
- Every test uses `userEvent.setup()` and `await`s each interaction — the existing `AppBanner.test.tsx`
  style (`render` + `screen` + role queries, `globals: true`, no imported `describe`/`it`) is the
  house style to match.

### 5.1 Which slices are red-first, and which are guards — stated plainly

Slices **01 and 02 are red-first**: each has scenarios that cannot pass until production code
changes. Slices **03 and 04 are guard slices**: given ADR-0007 and ADR-0004 respectively, their
scenarios pass on the first run, and that is the intended outcome, not a missing test. The developer
node should not go looking for a red bar in 03 or 04 — and must not loosen the design to obtain one.

**Why slice 03 is *not* red-first.** The tempting sequencing was: at slice 02 write
`lastSubmissionWasBlank` on the **blank branch only** (`{ ...visit, lastSubmissionWasBlank: true }`),
let the non-blank branch carry the old value through by spread, and let slice 03's *"Correcting a
blank submission clears the alert"* be the scenario that goes red. It is true that none of slice 02's
five scenarios can observe the flag returning to `false`: scenario 4 greets first and *then* submits
blank, so within slice 02 the flag only ever travels `false → true`.

That sequencing is **rejected** (ADR-0007). It buys a red bar by shipping a user-visible
accessibility defect for the length of a slice. Concretely, at the end of slice 02 with all five of
its scenarios green: a visitor submits blank, sees the alert, types "Grace", submits — the status
region reads `Hello, Grace` **and** the alert *"Please enter your name."* is still on
screen, with the Name field's `aria-describedby` still pointing at it, so a screen reader announces
an error as the description of a field that just succeeded. That is exactly the symptom ADR-0001's
Context names as the reason the two fields belong in one aggregate ("an alert that lingers next to a
fresh greeting"), and it is the same trade §5.1 refuses for slice 04. Refusing it there and taking it
here would be incoherent. It also requires the *less* obvious implementation: the shape a developer
reaches for anyway —

```ts
if (isBlank(rawName)) return { ...visit, lastSubmissionWasBlank: true }
return { greetedName: rawName.trim(), lastSubmissionWasBlank: false }
```

— already satisfies INV-5a whole. The design would have to prescribe the spread-carrying variant on
purpose to manufacture the red.

So INV-5a arrives whole at slice 02, and slice 03 is a guard slice. Its three scenarios are not
tautologies — each fails against a specific plausible wrong implementation, which is what makes them
worth writing: *"Correcting a blank submission clears the alert"* fails if the non-blank branch ever
stops writing the flag; *"The alert stays until the visitor submits again"* fails if the component
clears the alert in the field's `onChange`; *"Retrying with a whitespace-only name still shows the
alert"* fails if a retry path re-derives blankness anywhere but in `isBlank`.

**Why slice 04 is *not* red-first, and why that is the right trade.** The only way to make slice 04
fail first would be to leave the state's location undecided during slices 01–03 — the visit in a
module-level `let`, a context above the screen, or a storage write; or the draft name in a hoisted
`let`/`defaultValue` (INV-6c) — and then move it. ADR-0004 forbids all of these,
deliberately: buying one red test by knowingly shipping three slices with a state leak is a
bad trade, and the leak is exactly the defect Story 4 exists to prevent. So slice 04 ships two
**guard** (characterisation) tests. They are cheap, they are one sitting, and they are not
decoration: they fail the moment a future change lifts the state out of `GreetingScreen`, which is
the realistic regression.

If any guard scenario (the three in slice 03, the two in slice 04) *does* go red, the intended fix is
structural, never cosmetic:

- Slice 04 red ⇒ **read which step is red first, because the two scenarios cover two different
  hooks.** If `Then the status region is present and contains no text` or `And no element with role
  "alert" is present` is red, the **visit** was lifted out of the component (INV-6a) — a module-level
  `let`, a context provider above the screen, or web storage. If `Then the Name field is empty` is
  red, the **draft name** was lifted out (INV-6c) — a module-level `let rawName`, a hoisted
  `defaultValue`, or an uncontrolled input whose value survives the remount; the visit is not the
  culprit and moving it will not fix it. Fix either one the same way: put the state back in a
  `useState` **inside `GreetingScreen`** (`useState<Visit>(newVisit)`, `useState<string>('')`). Do
  **not** add reset logic on top of leaked state (the issue file says the same).
- Slice 03 red ⇒ one of the three wrong implementations listed above. Fix by branch: if *"the alert
  stays until the visitor submits again"* is red, the component is clearing the alert in the field's
  `onChange` — delete that clearing, do not add a timer or an effect (INV-5a says only `submit`
  writes the flag). If *"correcting a blank submission clears the alert"* is red, `submit`'s
  non-blank branch stopped assigning `lastSubmissionWasBlank: false` — restore the assignment, do not
  clear the alert from the component.

### 5.2 Slice independence, and which invariants are live when

Each slice compiles and passes on its own, against `strict` + `noUnusedLocals`. Because the design
is built outside-in, the module surface in §4.1 is an **end state**: a *concept* is written when a
scenario first demands it, and not before — but no single invariant is split across slices, because
a half-written rule is a shipped defect (ADR-0007). This table says exactly when each one becomes
live, so that a gap is read as sequencing rather than as a hole:

| Invariant | Live from | Note |
| --- | --- | --- |
| INV-3 (greeting format), INV-6a (visit lifetime = mount), **INV-6c (draft-name lifetime = mount)**, INV-6b (pure module), INV-7 (field keeps raw text), P1 (status region always present) | **slice 01** | The whole of slice 01's behaviour. INV-6c is live from slice 01 because the field exists from slice 01 — but it is only *pinned* at slice 04, by Story 4's `Then the Name field is empty` step (§5.1). |
| INV-2 — *trimmed* half | **slice 01** | `submit` assigns `rawName.trim()` on its single, unguarded path. There is no blank branch yet to be non-blank about, so this is a concept not yet introduced — not a rule half-written. |
| **INV-8a (every success is a new greeting), P4 (status region's keyed child)** | **slice 01** | R9's success half. It arrives whole with the success path — the branch that writes it is the only branch that exists at slice 01. Its domain half is unit-asserted (§5.4); its DOM half is human-verified (VH-10). |
| INV-1 (blankness), INV-2 — *non-blank* half, INV-4 (blank preserves greeting), **INV-5a whole (both branches)**, INV-5b (alert text iff flag), **INV-8b (every blank is a new rejection), P5 (alert's keyed child)**, P2, P3 | **slice 02** | The blank-name concept does not exist before this slice; when it arrives, it arrives complete (ADR-0007) — including its half of R9, which is why R9 is two invariants and not one (§2.4). |
| *(none new)* | slice 03 | Guard slice: it pins INV-5a, INV-5b and P2/P3 through the recovery path (§5.1). |
| *(none new)* | slice 04 | Guard slice: it pins INV-6a **and INV-6c** rather than adding an invariant — the greeting/alert steps pin the visit, the `Then the Name field is empty` step pins the draft name. INV-6b is pinned by §5.3's guard, not by these scenarios. |

**R7 traceability, since it is the one rule with three halves.** *No greeting* and *no alert* →
INV-6a (both are fields of `Visit`, and a fresh mount re-runs `useState<Visit>(newVisit)`).
*No name* → **INV-6c** (a fresh mount re-runs `useState<string>('')`). Both are owned by
`GreetingScreen` and by nothing else; each is a separate invariant because each is a separate hook a
developer could hoist independently, and Story 4 has a separate red step for each.

What that means concretely, slice by slice:

- **Slice 01** introduces no blank-name concept at all. Its "no element with role `alert` is present"
  steps pass trivially because nothing renders an alert yet — a correct outside-in state, not a hole.
  `submit` assigns `rawName.trim()` unconditionally, so `greetedName` could in principle hold `''`
  and `greetingText` could in principle return `'Hello, '`. **No slice-01 scenario can reach that
  state**, and writing the guard before slice 02's scenarios demand it would be speculative code.
  INV-2 is therefore only half-live here, which §4.1 and ADR-0002 both say out loud. Note the
  difference from the rejected INV-5a sequencing (§5.1): here the *concept* (blankness) is absent, so
  no visitor can reach a wrong state; there, the concept was present and one branch of it was
  deliberately left wrong, which a visitor could see. Absent concept, yes; half-written rule, no.
  Slice 01 *does* carry R9's success half (INV-8a/P4): the success path is the path being built, and
  `greetingCount` is written by the only branch `submit` has at this point, so the rule arrives
  whole — the same test ADR-0007 applies to INV-5a.
- **Slice 02** extends the `Visit` type with two more fields (`lastSubmissionWasBlank` and
  `blankCount`) and splits `submit` into two branches, **both** assigning the flag (ADR-0007) and
  each advancing exactly one counter (INV-8a/INV-8b). Because `newVisit` is the only literal
  construction site and `submit` returns object literals, the change is local: no other module names
  the new fields. This is the last slice that touches production code.
- **Slice 03** adds three scenarios and no production code — a guard slice (§5.1). If the developer
  finds themselves changing `visit.ts` here, slice 02 was implemented against INV-5a's blank branch
  only, and the fix belongs in slice 02's code, not in a new rule.
- **Slice 04** adds two scenarios and no production code (§5.1).
- No slice leaves an exported symbol unused (which `noUnusedLocals` would not catch but a reviewer
  should): `isBlank` is exported at slice 02 because it is the named owner of INV-1 and is the
  natural unit-test target; if it ends up used only inside `submit`, collapse the export in the
  deepening pass (§7).

### 5.3 The non-DOM file, part one: the INV-6b purity guard (slice 01)

> `src/visit.test.ts` is the only file in the feature that is not a DOM test. It holds two unrelated
> things, and each is justified separately so neither is read as licence for the other: the purity
> guard below (ADR-0008), and R9's counter assertions in §5.4 (ADR-0009). Both are assertions about
> the pure module, which ADR-0003 already permits as an inner cycle; neither is an acceptance step,
> a spy, or a substitute for a scenario.

INV-6b's second half — *no reference to an ambient browser global* — is **not** implied by the
module's empty import list. `tsconfig.json` declares `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, so
`localStorage`, `sessionStorage`, `fetch`, `document` and `window` are ambient in every file in
`src/`. A line such as `localStorage.setItem('name', rawName.trim())` inside `submit` compiles under
`tsc -b`, runs, imports nothing, and — since VH-06 removed the only step that could observe it —
leaves all sixteen scenarios green, because nothing reads the value back so a fresh mount still
renders `newVisit`. A reviewer applying the old "read the import list" rule would see a clean file.
That guard was inoperative; this one replaces it (ADR-0008).

Landed with `src/visit.ts` in **slice 01**. Two files, both verified against the installed toolchain
(`npx tsc -b` clean, `vitest run` green, and green→red when a `localStorage` write is added):

```ts
// src/rawModules.d.ts — 4 lines, no dependency; lets the guard read a module as text.
declare module '*?raw' {
  const source: string
  export default source
}
```

```ts
// src/visit.test.ts
import visitSource from './visit.ts?raw'

const source = visitSource
  .replace(/\/\*[\s\S]*?\*\//g, '')  // strip block comments
  .replace(/\/\/.*$/gm, '')          // strip line comments

it('stays pure: no imports, no top-level mutable state, no ambient browser globals (INV-6b)', () => {
  expect(source).not.toMatch(/^\s*import\s/m)
  expect(source).not.toMatch(/^(let|var)\s/m)   // column 0 ⇒ module level; locals inside functions are fine
  expect(source).not.toMatch(
    /\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|document|window|globalThis|navigator|Date|Math\.random)\b/,
  )
})
```

> **Do not reach for `node:fs` here.** `readFileSync` is the obvious way to read the source, and it
> does not compile in this repo: `@types/node` is not installed (check `node_modules/@types/`), so
> `import { readFileSync } from 'node:fs'` fails `tsc -b` and breaks `npm run build`. Vite's `?raw`
> query needs no dependency at all — only the four-line ambient declaration above, because the repo's
> `tsconfig.json` lists `types` explicitly and does not include `vite/client`. (Adding `"vite/client"`
> to that array instead of the `.d.ts` also works; the `.d.ts` is chosen because it keeps the change
> inside `src/` and out of the build config.)

What it is and is not, so nobody over-trusts it:

- It is **lexical**, not semantic. `globalThis['local' + 'Storage']` evades it (which is why
  `globalThis` is itself in the list). It catches accident and drift — the realistic failure — not a
  determined author. The remainder is the review checklist in ADR-0008.
- It does **not** reopen VH-06. VH-06 rejected an *acceptance step* that spied on
  `Storage.prototype.setItem`; this is neither an acceptance step nor a spy nor a behaviour test. It
  is a static assertion about one non-component module, and `CLAUDE.md`'s "behaviour through the
  rendered DOM" rule governs component tests — ADR-0003 already permits `src/visit.test.ts` as an
  inner cycle.
- It cannot cover `GreetingScreen.tsx`, which legitimately uses React and the DOM. A storage write
  there is caught by the review checklist only. That is stated as a residual risk in §6, not papered
  over.
- `Date` and `Math.random` are in the list for a different reason (determinism/purity, not
  persistence); they are named so the rule is one grep rather than two.

### 5.4 R9 (every submit is perceivable): what is mechanical, what is human, what is measured

R9 is the one rule in this feature that **no acceptance criterion covers and none can** — the same
class of gap as VH-07's colour rule, and it is stated here rather than omitted, so nobody reads the
sixteen scenarios as covering it.

**What is measured.** Both shapes were built from this design and instrumented with a
`MutationObserver` on each region across a repeat submission (React 19, jsdom 26, `user-event`
14.6.4, `jest-dom` 6.9.1):

| Shape | Identical successful resubmit | Identical failing resubmit |
| --- | --- | --- |
| Without the counters (this design before this round) | **0 mutations** on the status region | **0 mutations** on the alert |
| With INV-8a/INV-8b + P4/P5 | **2 mutations** on the status region; **0** on the alert | **2 mutations** on the alert; **0 on the status region** |

The first row is the defect: the design as previously written produced exactly the silence VH-09
exists to prevent. The second row is both halves of the requirement at once — the region that
changed is renewed, the region that did not change is untouched (mockup §5's scoping rule and row
9). In both cases `getByRole('status')` and `getByRole('alert')` returned the **same element object**
before and after, so neither region is ever removed or recreated (VH-04, VH-09).

The measurement was taken on a throwaway copy of this repo (`npx tsc -b` exit 0, `vitest run` green
across the App-level walking skeleton driven keyboard-only, the recovery path, both tab-paste cases,
the purity guard and the counter assertions), then deleted — no production file in this repo was
written by the architect node. The point of saying so is narrow: the shapes this design prescribes
compile and run as written, so a red bar the developer hits is a real finding, not a design that was
never tried.

**What is mechanical.** Two assertions in `src/visit.test.ts` — the inner-cycle file that already
exists for §5.3, not a new kind of test and not an acceptance step:

```ts
it('counts every greeting, so an identical resubmit is still a new greeting (INV-8a)', () => {
  const once = submit(newVisit, 'Ada')
  const twice = submit(once, 'Ada')
  expect(greetingText(twice)).toBe('Hello, Ada')   // same text …
  expect(twice.greetingCount).toBe(2)              // … different value
})

// slice 02
it('counts every blank rejection and leaves the greeting count alone (INV-8b, R4)', () => {
  const greeted = submit(newVisit, 'Ada')
  const blank2 = submit(submit(greeted, '   '), '\t')
  expect(blank2.blankCount).toBe(2)
  expect(blank2.greetingCount).toBe(greeted.greetingCount)   // the scoping rule, mechanically
  expect(greetingText(blank2)).toBe('Hello, Ada')
})
```

These pin the domain half — *a submission is distinguishable from no submission, and each outcome
renews only its own region*. They do **not** prove a screen reader speaks.

**What stays human (accepted residual risk, alongside VH-07's).** Whether the renewed node is
actually *announced* is unobservable under the declared seam: jsdom implements no live-region
announcement, and rows 4a/12a are byte-identical to rows 4/12 in every property a query can read.
That check is VH-10's, performed at the VERIFY gate with a screen reader running. The risk if the
mechanism is wrong is cosmetic and reversible — a silent repeat click — and every one of the sixteen
scenarios passes either way. **The developer node must not manufacture a jsdom "coverage" test for
it**; a passing test that cannot fail for the reason it names is worse than the honest gap
(§5's seam mechanics, VH-10).

---

## 6. Trade-offs and ADRs

Decisions significant enough to record (full options/consequences in each file). All nine are
**Proposed — accepted pending the human VERIFY gate**: they describe code that does not exist yet,
ADR-0002's chosen copy additionally depends on the still-open VH-03, and ADR-0009 additionally
depends on the still-open VH-09/VH-10.

| ADR | Decision | Chief alternative rejected |
| --- | --- | --- |
| [0001](../../../docs/adr/0001-single-in-memory-visit-aggregate.md) | One aggregate (`Visit`), one command (`submit`) | Separate `Name` and `Greeting` aggregates (would invent a cross-aggregate transaction) |
| [0002](../../../docs/adr/0002-greeting-derived-from-submitted-name.md) | Store the submitted **name**; derive the greeting text | Store the greeting string (a second source of truth the seed forbids) |
| [0003](../../../docs/adr/0003-domain-rules-in-a-pure-module.md) | Rules in `src/visit.ts`, not inside the component; message copy lives there, element shape does not | Inline in `GreetingScreen` (cheapest today, hides the invariant owners); or a nullable marker mapped to copy in the component (splits the alert's ownership in two) |
| [0004](../../../docs/adr/0004-component-local-state-no-store.md) | `useState` inside `GreetingScreen` | Module singleton / Context / a store library (each breaks or over-serves R7) |
| [0005](../../../docs/adr/0005-acceptance-seam-per-slice.md) | DOM seam per slice; `App` for composition, `GreetingScreen` for the rest | One `App.test.tsx` for all 16 scenarios; or a browser E2E runner |
| [0006](../../../docs/adr/0006-no-driven-ports-or-domain-events.md) | No ports, no event bus, no i18n indirection — yet | Introducing a `Visit` store port "for later" |
| [0007](../../../docs/adr/0007-invariants-arrive-whole-per-slice.md) | INV-5a arrives whole at slice 02; slice 03 is a guard slice | Deferring the non-blank branch to slice 03 to obtain a red bar (ships a lingering alert beside a fresh greeting for one slice) |
| [0008](../../../docs/adr/0008-guarding-domain-purity.md) | INV-6b's ambient-globals half is guarded by a lexical assertion in `src/visit.test.ts` plus a named review checklist | Relying on the import list (inoperative — `DOM` is in `lib`); a `Storage` spy (VH-06 rejected it); ESLint `no-restricted-globals` (a new dev dependency); a DOM-free tsconfig project for the domain (restructures the declared build) |
| [0009](../../../docs/adr/0009-making-every-submit-perceivable.md) | R9/VH-09 is **adopted, and owned by the aggregate**: two monotonic counters written by `submit` (INV-8a/INV-8b), rendered as the key of one child node per region (P4/P5) | Leaving it unconstrained and delegating to the developer node (ships the measured silence of §5.4); component-local nonces (puts the rule in the component and makes it untestable); a visually-hidden counter in the text (breaks VH-04's textless region and Story 1's exact text); a single `submissionCount` (would force-mutate the status region on a *failing* submit, contradicting Story2-S4) |

Accepted risks, stated plainly:

- **Two literal strings are unconfirmed product copy** (`'Greet me'`, the alert text — VH-03). Each
  has exactly one production edit site by design (§2.5): `ALERT_MESSAGE` in `src/visit.ts`, and one
  JSX node in `GreetingScreen.tsx`. A rename is that edit plus the literals in the tests.
- **"No colour-only signal" is not machine-checked** (VH-07). Architecturally the only thing this
  design can do is guarantee the message is *text in the DOM, associated with the field* — which it
  does via P2/P3. The remainder is the human VERIFY check.
- **A never-read storage write would pass the sixteen scenarios** (VH-06). Do **not** read INV-6b's
  "imports nothing" rule as a structural mitigation: `tsconfig.json` puts `DOM` in `lib`, so
  `localStorage.setItem(...)` needs no import and typechecks anywhere in `src/` (§5.3). What actually
  stands behind the seed's "no backend, no localStorage, no analytics" is therefore: (a) the lexical
  purity assertion in `src/visit.test.ts`, which covers `src/visit.ts` mechanically; and (b) a named
  two-line review checklist for `GreetingScreen.tsx`, which nothing mechanical covers (ADR-0008). The
  component half rests on review, and that is a residual risk, not a guarantee.
- **Two of the four slices cannot be red-first**: slice 03 under ADR-0007, slice 04 under ADR-0004
  (§5.1). Accepted and labelled as guard slices, with the wrong implementations each one catches
  spelled out, so nobody manufactures a fake red by loosening the design first.
- **R9 has no acceptance criterion, and its announcement half is not machine-checked** (VH-09,
  VH-10, ADR-0009, §5.4). What this design *can* guarantee mechanically is that each submission
  produces a distinguishable state and renews exactly one region's node — INV-8a/INV-8b are
  unit-asserted, P4/P5 are two lines of JSX a reviewer can see, and the mutation behaviour was
  measured (§5.4). Whether a screen reader speaks the renewed node is a human check at VERIFY.
  Two named costs come with the choice: the aggregate carries two fields whose only consumer is a
  render key, and R9 is the one rule here that a green suite does not defend — if VH-09 is ever
  withdrawn by a human, delete the two fields, the two keys, and the two unit assertions; nothing
  else in this design moves.

---

## 7. Deepening pass (after slice 04 lands)

Look for interfaces wider than the work behind them, and narrow them:

1. If `isBlank` has exactly one caller (`submit`), stop exporting it — the module's public surface
   should be `newVisit`, `submit`, `greetingText`, `alertText`, `ALERT_MESSAGE`, and nothing else.
2. If `GreetingScreen.tsx` has grown past roughly one screenful, the split to make is
   *domain vs. presentation*, not *presentation vs. presentation*: the rules are already out; the
   next honest extraction would be a `NameField` only if a second field ever exists.
3. `src/App.test.tsx` should contain **exactly one `it`** — the walking-skeleton scenario, with all
   of its steps (heading, greeting text and button name included). A **second** `it` appearing there
   is the tripwire: it means the file has started duplicating `GreetingScreen.test.tsx`, and the new
   scenario belongs there instead. The rule is a count, not a subject, precisely because the
   skeleton scenario is *supposed* to assert greeting behaviour at the composition seam (ADR-0005).
4. Revisit ADR-0006 the moment anything must outlive a visit; that is the seam where a driven port
   (and a domain event) earns its keep.
5. **Re-examine the two counters once the human has ruled on VH-09.** They are the narrowest thing
   in this design that exists for a reason no test defends. If VH-09 is confirmed, leave them and
   consider whether the seam can ever observe announcement (an `axe`/AT harness would turn VH-10's
   human check into an assertion — a new stack, so not now, N6). If VH-09 is withdrawn, delete
   `greetingCount`, `blankCount`, P4/P5's keys and the two `visit.test.ts` assertions: `Visit`
   returns to two fields and ADR-0009 is superseded, not amended.
6. The INV-6b purity assertion (§5.3) stays as long as the no-persistence rule does. If the module
   ever acquires a *legitimate* need for one of the listed globals, that is a signal the rule has
   moved — reopen ADR-0008 (and probably ADR-0006) rather than widening the regex quietly. If the
   repo ever adopts a linter, replace the assertion with `no-restricted-globals`; if the build ever
   grows project references, the DOM-free tsconfig option in ADR-0008 becomes cheap and strictly
   better, because it is structural rather than lexical.
